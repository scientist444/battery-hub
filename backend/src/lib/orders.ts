import { randomUUID } from 'crypto';
import { container, isConflict, queryAll, readDoc } from './cosmos';
import { HttpError } from './http';
import { invalidateCatalog } from './catalog';
import { Quote } from './quote';
import { Customer, Order, OrderCustomer, OrderStatus, PaymentMethod, Product, StoreSettings } from './types';

const MAX_RETRIES = 5;

/** Next order number (BH-10001, BH-10002, ...) from a counter document, safe under concurrent checkouts. */
async function nextOrderNumber() {
  const counters = container('settings');
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await readDoc<{ id: string; value: number }>('settings', 'order-counter');
    try {
      if (!current) {
        await counters.items.create({ id: 'order-counter', value: 10001 });
        return 'BH-10001';
      }
      const value = current.doc.value + 1;
      await counters.item('order-counter', 'order-counter').replace({ id: 'order-counter', value }, { accessCondition: { type: 'IfMatch', condition: current.etag } });
      return `BH-${value}`;
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
  throw new HttpError(503, 'The store is busy. Please try again.');
}

/** Change a tracked product's stock by `delta`, refusing to go below zero. */
async function adjustStock(productId: string, categoryId: string, delta: number) {
  const item = container('products').item(productId, categoryId);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await readDoc<Product>('products', productId, categoryId);
    if (!current) throw new HttpError(409, 'A product in your cart is no longer available.', { productId });
    if (current.doc.stock === null) return;
    const stock = current.doc.stock + delta;
    if (stock < 0) throw new HttpError(409, `Only ${current.doc.stock} of ${current.doc.name} left in stock.`, { productId, available: current.doc.stock });
    try {
      await item.replace({ ...current.doc, stock, updatedAt: new Date().toISOString() }, { accessCondition: { type: 'IfMatch', condition: current.etag } });
      return;
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
  throw new HttpError(503, 'The store is busy. Please try again.');
}

async function upsertCustomer(customer: OrderCustomer): Promise<Customer> {
  const existing = await readDoc<Customer>('customers', customer.phone, customer.phone);
  const now = new Date().toISOString();
  const next: Customer = {
    id: customer.phone,
    phone: customer.phone,
    name: customer.name,
    email: customer.email,
    orderCount: (existing?.doc.orderCount ?? 0) + 1,
    refusedCount: existing?.doc.refusedCount ?? 0,
    lastOrderAt: now,
  };
  await container('customers').items.upsert(next);
  return next;
}

/** Why an order should wait for a manual check before booking, if at all. */
export function holdReason(totalPkr: number, customer: Pick<Customer, 'refusedCount'>, settings: StoreSettings) {
  if (totalPkr > settings.holdAbovePkr) return `Order total is above Rs. ${settings.holdAbovePkr}.`;
  if (customer.refusedCount > 0) return `Customer refused ${customer.refusedCount} earlier delivery(s).`;
  return undefined;
}

export async function createOrder(
  quote: Quote,
  customer: OrderCustomer,
  notes: string | undefined,
  settings: StoreSettings,
  paymentMethod: PaymentMethod = 'cod',
  accountId?: string,
): Promise<Order> {
  const prepaid = paymentMethod !== 'cod';
  if (!prepaid && quote.totalPkr > settings.maxCodPkr) {
    throw new HttpError(409, `Cash on delivery is available for orders up to Rs. ${settings.maxCodPkr}. Please contact us on WhatsApp for larger orders.`);
  }

  // Take stock first; give it back if anything later fails.
  const taken: { productId: string; categoryId: string; qty: number }[] = [];
  try {
    for (const line of quote.lines) {
      if (line.product.stock === null) continue;
      await adjustStock(line.product.id, line.product.categoryId, -line.qty);
      taken.push({ productId: line.product.id, categoryId: line.product.categoryId, qty: line.qty });
    }

    const [number, customerDoc] = await Promise.all([nextOrderNumber(), upsertCustomer(customer)]);
    // Advance payments wait until the payment is seen in the account; the admin then confirms the order.
    const reason = prepaid ? 'Waiting for payment.' : holdReason(quote.totalPkr, customerDoc, settings);
    const status: OrderStatus = reason ? 'on_hold' : 'confirmed';
    const now = new Date().toISOString();
    const courier = settings.courierMode === 'trax' ? 'trax' : 'manual';

    const order: Order = {
      id: randomUUID(),
      number,
      status,
      holdReason: reason,
      customer,
      items: quote.lines.map((l) => ({
        productId: l.product.id,
        categoryId: l.product.categoryId,
        name: l.product.name,
        unitPricePkr: l.product.pricePkr,
        qty: l.qty,
        supplierId: l.supplierId,
      })),
      shipments: quote.shipments.map((s) => ({
        supplierId: s.supplierId,
        pickup: s.pickup,
        itemIndexes: s.itemIndexes,
        courier,
        serviceCode: s.chosen.code,
        weightG: s.weightG,
        // Each parcel collects its own products plus its own delivery charge.
        codAmountPkr: prepaid ? 0 : s.subtotalPkr + s.chosen.feePkr,
        quotedFeePkr: s.chosen.feePkr,
        status,
        events: [],
      })),
      paymentMethod,
      paymentStatus: 'pending',
      subtotalPkr: quote.subtotalPkr,
      deliveryFeePkr: quote.deliveryFeePkr,
      totalPkr: quote.totalPkr,
      notes,
      accountId,
      history: [{ status, note: reason, by: 'checkout', at: now }],
      createdAt: now,
      updatedAt: now,
    };
    await container('orders').items.create(order);
    invalidateCatalog();
    return order;
  } catch (error) {
    await Promise.allSettled(taken.map((t) => adjustStock(t.productId, t.categoryId, t.qty)));
    throw error;
  }
}

export async function getOrder(id: string) {
  return readDoc<Order>('orders', id);
}

export async function findOrderByNumber(number: string) {
  const [order] = await queryAll<Order>('orders', 'SELECT * FROM c WHERE c.number = @number', [{ name: '@number', value: number }]);
  return order;
}

/** Save an order, failing if someone else changed it since it was read. */
export async function saveOrder(order: Order, etag: string) {
  const next = { ...order, updatedAt: new Date().toISOString() };
  await container('orders').item(order.id, order.id).replace(next, { accessCondition: { type: 'IfMatch', condition: etag } });
  return next;
}

/** Order status follows its shipments: the least advanced shipment wins, delivered only when all are. */
export function rollUpStatus(order: Order): OrderStatus {
  const flow: OrderStatus[] = ['on_hold', 'confirmed', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
  const statuses = order.shipments.map((s) => s.status);
  if (statuses.every((s) => s === 'cancelled')) return 'cancelled';
  if (statuses.some((s) => s === 'returning' || s === 'returned')) {
    return statuses.every((s) => s === 'returned' || s === 'cancelled') ? 'returned' : 'returning';
  }
  const active = statuses.filter((s) => s !== 'cancelled');
  return active.reduce((least, s) => (flow.indexOf(s) < flow.indexOf(least) ? s : least), 'delivered' as OrderStatus);
}

/** Put stock back for a cancelled or returned order. */
export async function restoreStock(order: Order) {
  await Promise.allSettled(order.items.map((item) => adjustStock(item.productId, item.categoryId, item.qty)));
  invalidateCatalog();
}

export async function recordRefusal(phone: string) {
  const existing = await readDoc<Customer>('customers', phone, phone);
  if (!existing) return;
  await container('customers').items.upsert({ ...existing.doc, refusedCount: existing.doc.refusedCount + 1 });
}
