import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { isBackendAdminEnabled } from '@/lib/backend';
import { getOrders, type AdminOrder } from '@/app/admin/backend-actions';
import { OrderList } from '@/components/admin/OrderList';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  ['', 'All'],
  ['on_hold', 'On hold'],
  ['confirmed', 'To book'],
  ['booked', 'Booked'],
  ['in_transit', 'In transit'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');
  const status = searchParams.status ?? '';

  let orders: AdminOrder[] = [];
  let loadError: string | undefined;
  try {
    orders = await getOrders(status || undefined, searchParams.q?.trim() || undefined);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load orders.';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Orders</h1>
      <p className="mt-1 text-sm text-slate-500">
        Until Trax is connected: book each confirmed order in the Trax portal, then add its tracking number here.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/admin/orders?status=${value}` : '/admin/orders'}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              status === value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-950',
            )}
          >
            {label}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Order no., phone or name"
            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
          />
        </form>
      </div>
      {loadError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <OrderList orders={orders} />
    </div>
  );
}
