import Link from 'next/link';
import { Package } from 'lucide-react';
import type { TrackedOrder } from '@/app/(store)/checkout/actions';
import { formatRupees } from '@/lib/format';
import { customerStatusLabel } from '@/lib/order-status';
import { PAYMENT_OPTIONS, type PaymentMethod } from '@/config/store';

/** `productLinks` maps API product IDs to product pages, for the review links on delivered orders. */
export function OrderHistory({ orders, productLinks = {} }: { orders: TrackedOrder[]; productLinks?: Record<string, string> }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        <Package className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2">No orders yet. Orders you place while signed in show up here.</p>
        <Link href="/products" className="mt-3 inline-block font-semibold text-blue-700">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const tracking = order.shipments.find((s) => s.trackingNumber);
        return (
          <div key={order.orderNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-950">{order.orderNumber}</p>
                <p className="text-xs text-slate-500">
                  {new Date(order.placedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  {PAYMENT_OPTIONS[order.paymentMethod as PaymentMethod]?.label ?? order.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-950">{formatRupees(order.totalPkr)}</p>
                <p className="text-xs font-semibold text-blue-700">{customerStatusLabel(order)}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{order.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</p>
            {order.status === 'delivered' && order.items.some((i) => i.productId && productLinks[i.productId]) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">How was it?</span>
                {order.items.map((item) =>
                  item.productId && productLinks[item.productId] ? (
                    <Link
                      key={item.productId}
                      href={`${productLinks[item.productId]}#reviews`}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 hover:border-amber-500"
                    >
                      ★ Review {item.name}
                    </Link>
                  ) : null,
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">{tracking ? `${tracking.courier ?? 'Courier'} tracking: ${tracking.trackingNumber}` : ''}</span>
              <span className="flex gap-4">
                {order.invoiceUrl && (
                  <a href={order.invoiceUrl} target="_blank" rel="noopener" className="font-semibold text-blue-700">
                    Invoice
                  </a>
                )}
                <Link href={`/track?order=${encodeURIComponent(order.orderNumber)}`} className="font-semibold text-blue-700">
                  Track
                </Link>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
