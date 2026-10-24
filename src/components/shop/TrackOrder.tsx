'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, Loader2, Package, Search } from 'lucide-react';
import { type TrackedOrder, trackOrder } from '@/app/(store)/checkout/actions';
import { formatRupees } from '@/lib/format';
import { customerStatusLabel } from '@/lib/order-status';
import { Button } from '@/components/ui/Button';


const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

export function TrackOrder({ initialOrder }: { initialOrder: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await trackOrder(orderNumber.trim(), phone.trim());
      if (result.ok) setOrder(result.data);
      else {
        setOrder(undefined);
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr,1fr,auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Order number</span>
          <input required placeholder="BH-10001" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Mobile number</span>
          <input required type="tel" placeholder="0300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </label>
        <Button type="submit" variant="accent" className="h-11" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Track
        </Button>
      </form>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {order && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">Order {order.orderNumber}</p>
              <p className="text-xl font-bold text-slate-950">
                {customerStatusLabel(order)}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {formatRupees(order.totalPkr)} · {new Date(order.placedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <ul className="mt-3 text-sm text-slate-600">
            {order.items.map((item) => (
              <li key={item.name}>
                {item.name} × {item.qty}
              </li>
            ))}
          </ul>

          {order.shipments.map((shipment, index) => (
            <div key={index} className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Package className="h-4 w-4 text-blue-600" />
                {shipment.trackingNumber ? `${shipment.courier ?? 'Courier'} tracking: ${shipment.trackingNumber}` : 'Not handed to the courier yet'}
              </p>
              {shipment.events.length > 0 && (
                <ol className="mt-3 space-y-2 border-l-2 border-slate-200 pl-4">
                  {[...shipment.events].reverse().map((event, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-slate-800">{event.message}</p>
                      <p className="text-xs text-slate-500">{new Date(event.at).toLocaleString('en-PK')}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
