'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTrackingNumber, setOrderStatus, type AdminOrder } from '@/app/admin/backend-actions';
import { formatRupees } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const PAYMENT_LABELS: Record<string, string> = { cod: 'COD', jazzcash: 'JazzCash', bank: 'HBL', sadapay: 'SadaPay' };

const STATUS_STYLES: Record<string, string> = {
  on_hold: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-blue-100 text-blue-900',
  booked: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-slate-200 text-slate-700',
  returned: 'bg-red-100 text-red-800',
};

function OrderCard({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [tracking, setTracking] = useState<Record<number, string>>({});

  const run = (action: () => Promise<{ ok: boolean; message: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  };

  const closed = ['cancelled', 'returned', 'delivered'].includes(order.status);
  const c = order.customer;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-950">
            {order.number}{' '}
            <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[order.status] ?? 'bg-slate-100 text-slate-800')}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </p>
          <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('en-PK')}</p>
          {order.holdReason && <p className="mt-1 text-xs text-amber-800">On hold: {order.holdReason}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-slate-950">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} {formatRupees(order.totalPkr)}
            {order.paymentMethod !== 'cod' && (
              <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs', order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>
                {order.paymentStatus === 'paid' ? 'paid' : 'not paid yet'}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {formatRupees(order.subtotalPkr)} + {formatRupees(order.deliveryFeePkr)} delivery
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-900">{c.name}</p>
          <p className="text-slate-600">
            <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>
            {c.email ? ` · ${c.email}` : ''}
          </p>
          <p className="text-slate-600">
            {c.address}, {c.cityName}
            {c.landmark ? ` (near ${c.landmark})` : ''}
          </p>
          {order.notes && <p className="mt-1 text-xs italic text-slate-500">Note: {order.notes}</p>}
        </div>
        <ul className="text-slate-700">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.name} × {item.qty}
            </li>
          ))}
        </ul>
      </div>

      {order.shipments.map((shipment, index) => (
        <div key={index} className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-600">
            Parcel {order.shipments.length > 1 ? index + 1 : ''} · {(shipment.weightG / 1000).toFixed(2)} kg · {shipment.serviceCode} ·{' '}
            {formatRupees(shipment.quotedFeePkr)}
          </span>
          {shipment.trackingNumber ? (
            <span className="font-semibold text-slate-900">Tracking {shipment.trackingNumber}</span>
          ) : (
            !closed && (
              <span className="ml-auto flex gap-2">
                <input
                  value={tracking[index] ?? ''}
                  onChange={(e) => setTracking((t) => ({ ...t, [index]: e.target.value }))}
                  placeholder="Trax tracking no."
                  className="h-9 w-40 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-950"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !(tracking[index] ?? '').trim()}
                  onClick={() => run(() => addTrackingNumber(order.id, index, tracking[index].trim()))}
                >
                  Save
                </Button>
              </span>
            )
          )}
          {shipment.lastError && <p className="w-full text-xs text-red-700">{shipment.lastError}</p>}
        </div>
      ))}

      {!closed && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {order.status === 'on_hold' && (
            <Button size="sm" disabled={pending} onClick={() => run(() => setOrderStatus(order.id, 'confirmed'))}>
              {order.paymentMethod === 'cod' ? 'Confirm order' : 'Payment received, confirm'}
            </Button>
          )}
          {order.status !== 'on_hold' && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setOrderStatus(order.id, 'delivered'))}>
              Mark delivered
            </Button>
          )}
          {['booked', 'in_transit', 'out_for_delivery', 'returning'].includes(order.status) && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setOrderStatus(order.id, 'returned'), `Mark ${order.number} as returned? Stock is added back.`)}
            >
              Mark returned
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-700"
            disabled={pending}
            onClick={() => run(() => setOrderStatus(order.id, 'cancelled'), `Cancel ${order.number}? Stock is added back.`)}
          >
            Cancel order
          </Button>
          {message && <span className={cn('text-sm', message.ok ? 'text-emerald-700' : 'text-red-700')}>{message.text}</span>}
        </div>
      )}
    </div>
  );
}

export function OrderList({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) return <p className="mt-8 text-center text-sm text-slate-500">No orders here yet.</p>;
  return (
    <div className="mt-4 space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
