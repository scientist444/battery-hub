'use server';

import { revalidatePath } from 'next/cache';
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
