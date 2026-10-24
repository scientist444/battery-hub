import Image from 'next/image';
import type { AdminOrder } from '@/app/admin/backend-actions';
import { formatRupees } from '@/lib/format';
import { PAYMENT_OPTIONS, WHATSAPP_DISPLAY_NUMBER, type PaymentMethod } from '@/config/store';

export const STORE_SITE = 'batteryhub.com.pk';

function paymentLine(order: AdminOrder) {
  const method = PAYMENT_OPTIONS[order.paymentMethod as PaymentMethod]?.label ?? order.paymentMethod;
  if (order.paymentStatus === 'paid' || (order.paymentMethod === 'cod' && order.status === 'delivered')) return { method, status: 'Paid' };
  if (order.paymentMethod === 'cod') return { method, status: 'Due on delivery' };
  return { method, status: 'Awaiting payment' };
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

/** Customer invoice, laid out for A4 when printed or saved as PDF. */
export function Invoice({ order }: { order: AdminOrder }) {
  const c = order.customer;
  const payment = paymentLine(order);
  const rider = order.shipments.some((s) => s.courier === 'rider');

  return (
    <article className="mx-auto max-w-3xl bg-white p-6 text-sm text-slate-800 sm:p-10 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
        <div className="flex items-center gap-3">
          <Image src="/BH LOGO.png" alt="Battery HUB logo" width={64} height={64} className="h-16 w-16 object-contain" priority />
          <div>
            <p className="text-2xl font-bold text-slate-950">Battery HUB</p>
            <p className="text-xs text-slate-500">Battery &amp; power solutions</p>
            <p className="mt-1 text-xs text-slate-600">
              {STORE_SITE} · WhatsApp {WHATSAPP_DISPLAY_NUMBER}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-wide text-slate-950">INVOICE</p>
          {order.status === 'cancelled' && <p className="mt-1 font-bold text-red-700">CANCELLED</p>}
          <dl className="mt-2 grid grid-cols-[auto,auto] justify-end gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-slate-500">Invoice no.</dt>
            <dd className="font-semibold text-slate-950">{order.number}</dd>
            <dt className="text-slate-500">Date</dt>
            <dd className="font-semibold text-slate-950">{date(order.createdAt)}</dd>
            <dt className="text-slate-500">Payment</dt>
            <dd className="font-semibold text-slate-950">{payment.method}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-semibold text-slate-950">{payment.status}</dd>
          </dl>
        </div>
      </header>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
        <p className="mt-1 text-base font-bold text-slate-950">{c.name}</p>
        <p>{c.phone}</p>
        <p>
          {c.address}
          {c.landmark ? ` (near ${c.landmark})` : ''}, {c.cityName}
        </p>
        {c.email && <p>{c.email}</p>}
      </section>

      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Product</th>
            <th className="py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="py-2 pr-2 text-right font-semibold">Unit price</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 pr-2 text-slate-500">{i + 1}</td>
              <td className="py-2 pr-2 font-medium text-slate-950">{item.name}</td>
              <td className="py-2 pr-2 text-right">{item.qty}</td>
              <td className="py-2 pr-2 text-right">{formatRupees(item.unitPricePkr)}</td>
              <td className="py-2 text-right font-semibold">{formatRupees(item.unitPricePkr * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-semibold">{formatRupees(order.subtotalPkr)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Delivery</span>
          <span className="text-right font-semibold">{rider ? 'Rider fare, paid to rider' : formatRupees(order.deliveryFeePkr)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold text-slate-950">
          <span>Total</span>
          <span>{formatRupees(order.totalPkr)}</span>
        </div>
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Thank you for shopping with Battery HUB.</p>
        <p className="mt-1">
          Questions about this order? WhatsApp {WHATSAPP_DISPLAY_NUMBER} with invoice no. {order.number}. This is a computer-generated
          invoice and needs no signature.
        </p>
      </footer>
    </article>
  );
}
