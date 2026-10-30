import { getSecret } from '../secrets';
import { OrderStatus, ShipmentEvent } from '../types';
import { BookingRequest, BookingResult, Courier, RateRequest, TrackingResult } from './courier';

/*
 * Trax merchant API (Sonic platform), per Trax's "API Document - SONIC Version 2.0".
 * Appendix IDs below are from that document. All Trax specifics live in this file.
 */

const BASE_URL = process.env.TRAX_BASE_URL || 'https://sonic.pk/api';
const TIMEOUT_MS = 8000;

// Appendix A: Regular.
const SERVICE_TYPE_REGULAR = 1;
// Appendix B: Electronics Accessories (Cases, Chargers, etc.), the closest type to batteries.
const ITEM_PRODUCT_TYPE_ELECTRONICS_ACCESSORIES = 5;
// Appendix D: COD. Prepaid orders are booked as COD with amount 0.
const PAYMENT_MODE_COD = 1;
// Appendix F: Reimbursement, Trax deducts its charges from the COD it pays out.
const CHARGES_MODE_REIMBURSEMENT = 4;
// Trax requires a consignee email; customers who gave none get the store's.
const FALLBACK_EMAIL = process.env.STORE_EMAIL || 'orders@batteryhub.com.pk';

/** Today's date in Pakistan (UTC+5) as YYYY-MM-DD, for pickup_date. */
function pickupDate(now = new Date()) {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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
  delivery?: { Regular?: string[] };
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
      label: [a.person_of_contact, a.address, cityName].filter(Boolean).join(', '),
    };
  });
}

/** Trax's charge for one service, plus the rest of its reply (shown in the admin rate test). */
export async function calculateCharges({ origin, destination, weightG, codAmountPkr, service, timeoutMs = 5000 }: RateRequest) {
  const body = await call<{ information?: Record<string, unknown> & { charges?: { total_charges?: number; gst?: number } } }>(
    'POST',
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
    timeoutMs,
  );
  const charges = body.information?.charges;
  if (typeof charges?.total_charges !== 'number') throw new TraxError('Trax returned no charges.', body);
  // Trax bills GST on top of total_charges (net_payable = COD - total_charges - gst), so the customer pays both.
  return { total: Math.ceil(charges.total_charges + (charges.gst ?? 0)), information: body.information };
}

export const trax: Courier = {
  name: 'trax',

  async getRate(request: RateRequest) {
    const { total } = await calculateCharges(request);
    return total;
  },

  async book({ order, shipment, destination, service, itemDescription, itemCount }: BookingRequest): Promise<BookingResult> {
    if (!shipment.pickup.traxPickupAddressId) {
      throw new TraxError(`Supplier ${shipment.supplierId} has no Trax pickup address ID.`);
    }
    const customer = order.customer;
    // The document's sample reply spells the key "tracking number"; accept either spelling.
    const body = await call<{ tracking_number?: string | number; 'tracking number'?: string | number }>('POST', '/shipment/book', {
      service_type_id: SERVICE_TYPE_REGULAR,
      pickup_address_id: shipment.pickup.traxPickupAddressId,
      information_display: 0,
      consignee_city_id: requireTraxCity(destination.traxCityId, destination.name),
      consignee_name: customer.name.slice(0, 100),
      consignee_address: [customer.address, customer.landmark].filter(Boolean).join(', ').slice(0, 190),
      consignee_phone_number_1: customer.phone,
      consignee_email_address: customer.email || FALLBACK_EMAIL,
      order_id: shipment.itemIndexes.length === order.items.length ? order.number : `${order.number}-${shipment.supplierId}`,
      item_product_type_id: ITEM_PRODUCT_TYPE_ELECTRONICS_ACCESSORIES,
      item_description: itemDescription.slice(0, 190),
      item_quantity: itemCount,
      item_insurance: 0,
      pickup_date: pickupDate(),
      special_instructions: 'Batteries. Handle with care.',
      estimated_weight: shipment.weightG / 1000,
      shipping_mode_id: service.courierId ?? 0,
      amount: Math.round(shipment.codAmountPkr),
      payment_mode_id: PAYMENT_MODE_COD,
      charges_mode_id: CHARGES_MODE_REIMBURSEMENT,
      // Trax's claim policy limits its liability on "allowed to open" shipments, so parcels stay closed.
      open_shipment: 0,
    });
    const trackingNumber = body.tracking_number ?? body['tracking number'];
    if (!trackingNumber) throw new TraxError('Trax returned no tracking number.', body);
    return { trackingNumber: String(trackingNumber) };
  },

  async track(trackingNumber: string): Promise<TrackingResult> {
    const body = await call<{ details?: { tracking_history?: { status?: string; status_reason?: string; timestamp?: number }[] } }>(
      'GET',
      '/shipment/track',
      { tracking_number: trackingNumber, type: 0 },
    );
    const history = body.details?.tracking_history ?? [];
    const events: ShipmentEvent[] = history.map((h) => ({
      status: h.status ?? '',
      message: [h.status, h.status_reason].filter(Boolean).join(' - '),
      // date_time is "DD/MM/YYYY hh:mm AM", which Date can't parse; timestamp is Unix seconds.
      at: h.timestamp ? new Date(h.timestamp * 1000).toISOString() : new Date().toISOString(),
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
    // type 1 = PDF (0 is JPEG).
    url.searchParams.set('type', '1');
    const response = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new TraxError(`Trax label failed: ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  },

  async cancel(trackingNumber: string) {
    await call('POST', '/shipment/cancel', { tracking_number: trackingNumber });
  },
};
