'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { REVIEWS_TAG } from '@/lib/reviews';
import { requireAdmin } from '@/lib/admin-session';
import { BackendError, backendFetch } from '@/lib/backend';
import { pushCatalog } from '@/lib/backend-catalog';
import { invoiceUrl } from '@/lib/invoice';
import type { UpdateResult } from '@/app/admin/actions';

function failure(error: unknown): UpdateResult {
  if (error instanceof BackendError) {
    const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
    const field = details?.fieldErrors && Object.entries(details.fieldErrors)[0];
    return { ok: false, message: field ? `${field[0]}: ${field[1][0]}` : error.message };
  }
  console.error('Backend admin action failed', error);
  return { ok: false, message: 'Something went wrong.' };
}

// ---------- Catalog ----------

export async function syncCatalog(): Promise<UpdateResult> {
  await requireAdmin();
  try {
    const r = await pushCatalog();
    return { ok: true, message: `Synced: ${r.created} added, ${r.updated} updated, ${r.deactivated} switched off, ${r.unchanged} unchanged.` };
  } catch (error) {
    return failure(error);
  }
}

// ---------- Supplier ----------

export interface SupplierRecord {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  active: boolean;
  locations: { address: string; cityId: string; cityName: string; traxPickupAddressId?: number; pickupHours?: string; isDefault: boolean }[];
}

export async function getSuppliers(): Promise<SupplierRecord[]> {
  await requireAdmin();
  const { suppliers } = await backendFetch<{ suppliers: SupplierRecord[] }>('admin', 'manage/suppliers');
  return suppliers;
}

const PICKUP_CITIES: Record<string, string> = { rawalpindi: 'Rawalpindi', islamabad: 'Islamabad' };

export async function saveSupplier(_prev: UpdateResult | undefined, formData: FormData): Promise<UpdateResult> {
  await requireAdmin();
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  const cityId = text('cityId');
  const traxId = text('traxPickupAddressId');
  if (!PICKUP_CITIES[cityId]) return { ok: false, message: 'Pickup city must be Rawalpindi or Islamabad.' };
  if (traxId && !/^\d+$/.test(traxId)) return { ok: false, message: 'Trax pickup ID must be a number.' };

  try {
    await backendFetch('admin', 'manage/suppliers', {
      body: {
        id: text('id') || 'main-supplier',
        name: text('name'),
        contactName: text('contactName') || undefined,
        phone: text('phone') || undefined,
        active: true,
        locations: [
          {
            address: text('address'),
            cityId,
            cityName: PICKUP_CITIES[cityId],
            traxPickupAddressId: traxId ? Number(traxId) : undefined,
            pickupHours: text('pickupHours') || undefined,
            isDefault: true,
          },
        ],
      },
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/admin/supplier');
  return { ok: true, message: 'Supplier saved.' };
}

// ---------- Orders ----------

export interface AdminOrder {
  id: string;
  number: string;
  status: string;
  holdReason?: string;
  createdAt: string;
  customer: { name: string; phone: string; email?: string; cityName: string; address: string; landmark?: string };
  items: { name: string; qty: number; unitPricePkr: number }[];
  shipments: {
    status: string;
    courier: string;
    itemIndexes?: number[];
    trackingNumber?: string;
    serviceCode: string;
    weightG: number;
    codAmountPkr?: number;
    quotedFeePkr: number;
    lastError?: string;
  }[];
  subtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  invoiceUrl?: string;
}

export async function getOrders(status?: string, q?: string): Promise<AdminOrder[]> {
  await requireAdmin();
  const query: Record<string, string> = { limit: '100' };
  if (status) query.status = status;
  if (q) query.q = q;
  const { orders } = await backendFetch<{ orders: AdminOrder[] }>('admin', 'manage/orders', { query });
  return orders.map((order) => ({ ...order, invoiceUrl: invoiceUrl(order.number) }));
}

export async function setOrderStatus(orderId: string, status: string, note?: string): Promise<UpdateResult> {
  await requireAdmin();
  try {
    await backendFetch('admin', `manage/orders/${encodeURIComponent(orderId)}/status`, { body: { status, note } });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Updated' };
}

export async function addTrackingNumber(orderId: string, shipmentIndex: number, trackingNumber: string): Promise<UpdateResult> {
  await requireAdmin();
  try {
    await backendFetch('admin', `manage/orders/${encodeURIComponent(orderId)}/tracking`, { body: { shipmentIndex, trackingNumber } });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Tracking number saved' };
}

// ---------- Reviews ----------

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  orderNumber: string;
  name: string;
  rating: number;
  title?: string;
  body: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

export async function getReviews(status?: string): Promise<AdminReview[]> {
  await requireAdmin();
  const { reviews } = await backendFetch<{ reviews: AdminReview[] }>('admin', 'manage/reviews', { query: status ? { status } : {} });
  return reviews;
}

export async function setReviewStatus(id: string, productId: string, status: 'approved' | 'hidden'): Promise<UpdateResult> {
  await requireAdmin();
  try {
    await backendFetch('admin', `manage/reviews/${encodeURIComponent(id)}/status`, { body: { productId, status } });
  } catch (error) {
    return failure(error);
  }
  // Show the change on product pages and the home page now, not after the five-minute cache.
  revalidateTag(REVIEWS_TAG);
  revalidatePath('/admin/reviews');
  return { ok: true, message: status === 'approved' ? 'Published' : 'Hidden' };
}

// ---------- Customer requests (stock alerts, bulk quotes) ----------

export interface AdminStockAlert {
  id: string;
  productId: string;
  productName: string;
  name?: string;
  contactPhone: string;
  createdAt: string;
}

export interface AdminQuoteRequest {
  id: string;
  name: string;
  contactPhone: string;
  organization?: string;
  city: string;
  details: string;
  status: 'new' | 'done';
  createdAt: string;
}

export async function getRequests(): Promise<{ alerts: AdminStockAlert[]; quotes: AdminQuoteRequest[] }> {
  await requireAdmin();
  return backendFetch('admin', 'manage/requests');
}

export async function setRequestStatus(
  id: string,
  body: { kind: 'alert'; productId: string; status: 'waiting' | 'notified' } | { kind: 'quote'; status: 'new' | 'done' },
): Promise<UpdateResult> {
  await requireAdmin();
  try {
    await backendFetch('admin', `manage/requests/${encodeURIComponent(id)}/status`, { body });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
  return { ok: true, message: 'Updated' };
}

// ---------- Delivery (Trax) ----------

export interface CourierServiceSetting {
  code: string;
  name: string;
  enabled: boolean;
  courierId?: number;
  etaDays?: string;
}

export interface CourierSettings {
  courierMode: 'flat' | 'trax';
  autoBook: boolean;
  services: (CourierServiceSetting & Record<string, unknown>)[];
}

type Attempt<T> = { ok: true; value: T } | { ok: false; error: string; responseKeys?: string[] };

export interface TraxCheck {
  cities: Attempt<number>;
  pickupAddresses: Attempt<{ id: number; label: string }[]>;
}

export async function getCourierSettings(): Promise<CourierSettings> {
  await requireAdmin();
  const { settings } = await backendFetch<{ settings: CourierSettings }>('admin', 'manage/settings');
  return settings;
}

export async function checkTrax(): Promise<TraxCheck> {
  await requireAdmin();
  return backendFetch<TraxCheck>('admin', 'manage/trax/check', { timeoutMs: 20000 });
}

export async function syncTraxCities(): Promise<UpdateResult> {
  await requireAdmin();
  try {
    const r = await backendFetch<{ matched: number; missing: string[]; traxCityCount: number }>('admin', 'manage/cities/sync', {
      method: 'POST',
      timeoutMs: 20000,
    });
    const missing = r.missing.length ? ` Not found in Trax: ${r.missing.join(', ')}.` : '';
    return { ok: true, message: `Trax has ${r.traxCityCount} cities; matched ${r.matched} of ours.${missing}` };
  } catch (error) {
    return failure(error);
  }
}

export async function saveCourierSettings(patch: Pick<CourierSettings, 'courierMode' | 'autoBook' | 'services'>): Promise<UpdateResult> {
  await requireAdmin();
  if (patch.services.some((s) => s.courierId !== undefined && (!Number.isInteger(s.courierId) || s.courierId < 0))) {
    return { ok: false, message: 'Trax service IDs must be whole numbers.' };
  }
  try {
    await backendFetch('admin', 'manage/settings', { method: 'PATCH', body: patch });
    revalidatePath('/admin/delivery');
    return { ok: true, message: 'Saved.' };
  } catch (error) {
    return failure(error);
  }
}

export interface TraxRateTest {
  origin: string;
  destination: string;
  weightG: number;
  rates: { code: string; name: string; courierId?: number; result: Attempt<number>; details?: Record<string, unknown> }[];
}

export async function testTraxRate(cityId: string, weightG: number): Promise<{ ok: true; test: TraxRateTest } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    const test = await backendFetch<TraxRateTest>('admin', 'manage/trax/rate', {
      query: { cityId, weightG: String(weightG) },
      timeoutMs: 20000,
    });
    return { ok: true, test };
  } catch (error) {
    return failure(error) as { ok: false; message: string };
  }
}
