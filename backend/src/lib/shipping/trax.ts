import { getSecret } from '../secrets';
import { OrderStatus, ShipmentEvent } from '../types';
import { BookingRequest, BookingResult, Courier, RateRequest, TrackingResult } from './courier';

/*
 * Trax merchant API (Sonic platform). Endpoint paths and field names follow the public
 * "Sonic API document v2"; confirm every one against the copy Trax issues before switching
 * courierMode to 'trax'. All Trax specifics live in this file.
 */

const BASE_URL = process.env.TRAX_BASE_URL || 'https://sonic.pk/api';
const TIMEOUT_MS = 8000;

const PAYMENT_MODE_COD = 1;
const SERVICE_TYPE_REGULAR = 1;
const ITEM_PRODUCT_TYPE_ELECTRONICS = 1;
// Who pays Trax's charges: billed to the BatteryHUB account, not collected from the consignee. Confirm the ID with Trax.
const CHARGES_MODE_SHIPPER = 4;

export class TraxError extends Error {
  constructor(message: string, public response?: unknown) {
    super(message);
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, params: Record<string, string | number>, timeoutMs = TIMEOUT_MS): Promise<T> {
  const apiKey = await getSecret('trax-api-key');
  if (!apiKey) throw new TraxError('Trax API key is not set in Key Vault (secret trax-api-key).');

  const url = new URL(BASE_URL + path);
  const init: RequestInit = {
    method,
    headers: { Authorization: apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (method === 'GET') {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  } else {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(params);
  }

  const response = await fetch(url, init);
  const body = (await response.json().catch(() => undefined)) as { status?: number; message?: string } | undefined;
  // Trax answers status 0 for success.
  if (!response.ok || !body || body.status !== 0) {
    throw new TraxError(`Trax ${path} failed (HTTP ${response.status}): ${body?.message ?? response.statusText}`, body);
  }
  return body as T;
}

function requireTraxCity(id: number | undefined, name: string) {
  if (!id) throw new TraxError(`City ${name} has no Trax city ID. Sync cities from Trax in admin.`);
  return id;
}

/** Map Trax's status text to an order status. Unknown text keeps the current status. */
export function mapTraxStatus(text: string): OrderStatus | null {
  const s = text.toLowerCase();
  if (s.includes('return') && (s.includes('delivered') || s.includes('received by shipper'))) return 'returned';
  if (s.includes('return')) return 'returning';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('out for delivery')) return 'out_for_delivery';
  if (s.includes('picked') || s.includes('pick up') || s.includes('pickup done')) return 'picked_up';
  if (s.includes('arrived') || s.includes('transit') || s.includes('dispatched') || s.includes('departed')) return 'in_transit';
  if (s.includes('booked')) return 'booked';
  return null;
}

interface TraxCity {
  id: number;
  name: string;
}

export async function listTraxCities(): Promise<TraxCity[]> {
  const body = await call<{ cities: TraxCity[] }>('GET', '/cities', {});
  return body.cities ?? [];
}

export interface TraxPickupAddress {
  id: number;
  label: string;
}

/** Pickup addresses saved in the Trax portal, so the admin can pick the supplier's ID. */
export async function listTraxPickupAddresses(): Promise<TraxPickupAddress[]> {
  const body = await call<{ pickup_addresses?: Record<string, unknown>[] }>('GET', '/pickup_addresses', {});
  return (body.pickup_addresses ?? []).map((a) => {
    const city = a.city as { name?: string } | string | undefined;
    const cityName = typeof city === 'string' ? city : city?.name;
    return {
      id: Number(a.id),
      label: [a.contact_person_name ?? a.name, a.address, cityName].filter(Boolean).join(', '),
    };
  });
}

export const trax: Courier = {
  name: 'trax',

  async getRate({ origin, destination, weightG, codAmountPkr, service }: RateRequest) {
    const body = await call<{ information?: { charges?: { total_charges?: number } } }>(
      'GET',
      '/charges_calculate',
      {
        service_type_id: SERVICE_TYPE_REGULAR,
        origin_city_id: requireTraxCity(origin.traxCityId, origin.name),
        destination_city_id: requireTraxCity(destination.traxCityId, destination.name),
        estimated_weight: weightG / 1000,
        shipping_mode_id: service.courierId ?? 0,
        amount: codAmountPkr,
      },
      // Checkout must not wait on Trax; callers fall back to the cached or flat rate.
      2000,
    );
    const total = body.information?.charges?.total_charges;
    if (typeof total !== 'number') throw new TraxError('Trax returned no charges.', body);
    return Math.ceil(total);
  },

  async book({ order, shipment, destination, service, itemDescription, itemCount }: BookingRequest): Promise<BookingResult> {
    if (!shipment.pickup.traxPickupAddressId) {
      throw new TraxError(`Supplier ${shipment.supplierId} has no Trax pickup address ID.`);
    }
    const customer = order.customer;
    const body = await call<{ tracking_number?: string | number }>('POST', '/shipment/book', {
      service_type_id: SERVICE_TYPE_REGULAR,
      pickup_address_id: shipment.pickup.traxPickupAddressId,
      information_display: 0,
      consignee_city_id: requireTraxCity(destination.traxCityId, destination.name),
      consignee_name: customer.name,
      consignee_address: [customer.address, customer.landmark].filter(Boolean).join(', '),
      consignee_phone_number_1: customer.phone,
      consignee_email_address: customer.email ?? '',
      order_id: shipment.itemIndexes.length === order.items.length ? order.number : `${order.number}-${shipment.supplierId}`,
      item_product_type_id: ITEM_PRODUCT_TYPE_ELECTRONICS,
      item_description: itemDescription.slice(0, 250),
      item_quantity: itemCount,
      item_insurance: 0,
      item_price: shipment.codAmountPkr,
      special_instructions: 'Open parcel allowed. Handle with care.',
      estimated_weight: shipment.weightG / 1000,
      shipping_mode_id: service.courierId ?? 0,
      amount: shipment.codAmountPkr,
      payment_mode_id: PAYMENT_MODE_COD,
      charges_mode_id: CHARGES_MODE_SHIPPER,
    });
    if (!body.tracking_number) throw new TraxError('Trax returned no tracking number.', body);
    return { trackingNumber: String(body.tracking_number) };
  },

  async track(trackingNumber: string): Promise<TrackingResult> {
    const body = await call<{ details?: { tracking_history?: { status?: string; status_reason?: string; date_time?: string }[] } }>(
      'GET',
      '/shipment/track',
      { tracking_number: trackingNumber, type: 0 },
    );
    const history = body.details?.tracking_history ?? [];
    const events: ShipmentEvent[] = history.map((h) => ({
      status: h.status ?? '',
      message: [h.status, h.status_reason].filter(Boolean).join(' - '),
      at: h.date_time ? new Date(h.date_time).toISOString() : new Date().toISOString(),
    }));
    events.sort((a, b) => a.at.localeCompare(b.at));
    const latest = events.at(-1)?.status ?? '';
    return { status: latest ? mapTraxStatus(latest) : null, courierStatus: latest, events };
  },

  async label(trackingNumber: string) {
    const apiKey = await getSecret('trax-api-key');
    if (!apiKey) throw new TraxError('Trax API key is not set in Key Vault (secret trax-api-key).');
    const url = new URL(`${BASE_URL}/shipment/air_waybill`);
    url.searchParams.set('tracking_number', trackingNumber);
    url.searchParams.set('type', '0');
    const response = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new TraxError(`Trax label failed: ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  },

  async cancel(trackingNumber: string) {
    await call('POST', '/shipment/cancel', { tracking_number: trackingNumber });
  },
};
