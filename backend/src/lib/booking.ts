import { findCity } from './cities';
import { getCities } from './context';
import { isConflict } from './cosmos';
import { getOrder, recordRefusal, restoreStock, rollUpStatus, saveOrder } from './orders';
import { getSettings } from './settings';
import { trax } from './shipping/courier-registry';
import { Order, OrderStatus } from './types';

const TERMINAL: OrderStatus[] = ['delivered', 'cancelled', 'returned'];

/**
 * Book every unbooked Trax shipment of an order. Throws on failure so the queue retries
 * (5 attempts, then the message moves to the poison queue and the error stays on the order).
 */
export async function bookOrder(orderId: string, by = 'system') {
  const found = await getOrder(orderId);
  if (!found) throw new Error(`Order ${orderId} not found.`);
  const { doc: order } = found;
  const { etag } = found;
  if (order.status !== 'confirmed' && order.status !== 'booked') return order;

  const [settings, cities] = await Promise.all([getSettings(), getCities()]);
  const destination = findCity(order.customer.cityId, cities);
  if (!destination) throw new Error(`City ${order.customer.cityId} not found.`);

  let current: Order = order;
  for (const [index, shipment] of order.shipments.entries()) {
    if (shipment.trackingNumber || shipment.courier !== 'trax' || shipment.status === 'cancelled') continue;
    const origin = findCity(shipment.pickup.cityId, cities);
    const service = settings.services.find((s) => s.code === shipment.serviceCode);
    try {
      if (!origin) throw new Error(`Pickup city ${shipment.pickup.cityId} not found.`);
      if (!service) throw new Error(`Delivery service ${shipment.serviceCode} is not configured.`);
      const items = shipment.itemIndexes.map((i) => order.items[i]);
      const result = await trax.book({
        order,
        shipment,
        origin,
        destination,
        service,
        itemDescription: items.map((i) => `${i.qty} x ${i.name}`).join(', '),
        itemCount: items.reduce((sum, i) => sum + i.qty, 0),
      });
      const now = new Date().toISOString();
      current.shipments[index] = {
        ...shipment,
        trackingNumber: result.trackingNumber,
        billedFeePkr: result.feePkr,
        status: 'booked',
        bookedAt: now,
        lastError: undefined,
        events: [...shipment.events, { status: 'booked', message: `Booked with Trax (${service.name})`, at: now }],
      };
    } catch (error) {
      current.shipments[index] = { ...shipment, lastError: (error as Error).message };
      current = await saveOrder(current, etag);
      throw error;
    }
  }

  const status = rollUpStatus(current);
  if (status !== current.status) current.history.push({ status, by, at: new Date().toISOString() });
  current.status = status;
  return saveOrder(current, etag);
}

/** Pull the latest Trax status for an order's booked shipments and update the order. */
export async function refreshTracking(order: Order, etag: string) {
  let changed = false;
  for (const [index, shipment] of order.shipments.entries()) {
    if (!shipment.trackingNumber || shipment.courier !== 'trax' || TERMINAL.includes(shipment.status)) continue;
    const result = await trax.track(shipment.trackingNumber);
    if (result.courierStatus === shipment.courierStatus && result.events.length === shipment.events.length) continue;
    order.shipments[index] = {
      ...shipment,
      courierStatus: result.courierStatus,
      status: result.status ?? shipment.status,
      events: result.events.length ? result.events : shipment.events,
      deliveredAt: result.status === 'delivered' ? new Date().toISOString() : shipment.deliveredAt,
    };
    changed = true;
  }
  if (!changed) return order;

  const previous = order.status;
  const status = rollUpStatus(order);
  if (status !== previous) {
    order.status = status;
    order.history.push({ status, by: 'trax', at: new Date().toISOString() });
    if (status === 'returning' && previous !== 'returning') await recordRefusal(order.customer.phone);
    if (status === 'returned') await restoreStock(order);
  }
  try {
    return await saveOrder(order, etag);
  } catch (error) {
    // Someone edited the order meanwhile; the next run picks the change up.
    if (isConflict(error)) return order;
    throw error;
  }
}
