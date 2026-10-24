import { createHmac, timingSafeEqual } from 'node:crypto';
import { backendFetch } from '@/lib/backend';
import type { AdminOrder } from '@/app/admin/backend-actions';

/**
 * Invoice links carry a signature of the order number, so a customer can open (and share) their own
 * invoice without signing in, while order numbers, which run in sequence, cannot be guessed.
 */
function key() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? `${secret}:invoice` : null;
}

function sign(orderNumber: string) {
  const k = key();
  return k ? createHmac('sha256', k).update(orderNumber).digest('base64url').slice(0, 32) : null;
}

/** Link to the printable invoice, or undefined when no signing secret is configured. */
export function invoiceUrl(orderNumber: string) {
  const token = sign(orderNumber);
  return token ? `/invoice/${encodeURIComponent(orderNumber)}?t=${token}` : undefined;
}

export function verifyInvoiceToken(orderNumber: string, token: string | undefined) {
  const expected = sign(orderNumber);
  if (!expected || !token || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Full order for an invoice or packing slip. Server-only: uses the admin key. */
export async function getOrderByNumber(orderNumber: string) {
  const { orders } = await backendFetch<{ orders: AdminOrder[] }>('admin', 'manage/orders', { query: { q: orderNumber, limit: '5' } });
  return orders.find((o) => o.number === orderNumber);
}
