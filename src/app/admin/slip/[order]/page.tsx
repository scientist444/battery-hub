import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/invoice/PrintButton';
import { STORE_SITE } from '@/components/invoice/Invoice';
import { WHATSAPP_DISPLAY_NUMBER } from '@/config/store';
import { requireAdmin } from '@/lib/admin-session';
import { formatRupees } from '@/lib/format';
import { getOrderByNumber } from '@/lib/invoice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Packing slip' };

/**
 * Branded 4 x 6 inch packing slip, one per parcel: stuck on the courier flyer next to the courier's own
 * airway bill, or put inside. Shows our logo and contact, never the supplier's address.
 */
export default async function PackingSlipPage({ params }: { params: { order: string } }) {
  await requireAdmin();
  const order = await getOrderByNumber(decodeURIComponent(params.order).toUpperCase());
  if (!order) notFound();
  const c = order.customer;

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{'@page { size: 4in 6in; margin: 0; } @media print { .slip + .slip { break-before: page; } }'}</style>
      <div className="mx-auto mb-4 flex w-[4in] justify-end print:hidden">
        <PrintButton label="Print slip" />
      </div>
      {order.shipments.map((shipment, index) => {
        const items = shipment.itemIndexes?.length ? shipment.itemIndexes.map((i) => order.items[i]) : order.items;
        const collect = order.paymentStatus === 'paid' || order.paymentMethod !== 'cod' ? 0 : shipment.codAmountPkr ?? order.totalPkr;
        return (
          <section
            key={index}
            className="slip mx-auto mb-6 flex h-[6in] w-[4in] flex-col overflow-hidden border border-slate-300 bg-white p-[0.25in] text-[11px] leading-tight text-slate-900 print:mb-0 print:border-0"
          >
            <header className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
              <Image src="/BH LOGO.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" priority />
              <div className="flex-1">
                <p className="text-lg font-bold">Battery HUB</p>
                <p className="text-[10px] text-slate-600">
                  {STORE_SITE} · WhatsApp {WHATSAPP_DISPLAY_NUMBER}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase text-slate-500">Order</p>
                <p className="text-base font-bold">{order.number}</p>
                {order.shipments.length > 1 && (
                  <p className="text-[9px] text-slate-500">
                    Parcel {index + 1} of {order.shipments.length}
                  </p>
                )}
              </div>
            </header>

            <div className="mt-2">
              <p className="text-[9px] font-semibold uppercase text-slate-500">Ship to</p>
              <p className="text-sm font-bold">{c.name}</p>
              <p>{c.phone}</p>
              <p>
                {c.address}
                {c.landmark ? ` (near ${c.landmark})` : ''}
              </p>
              <p className="font-semibold">{c.cityName}</p>
            </div>

            <div className="mt-2 flex-1 overflow-hidden">
              <p className="text-[9px] font-semibold uppercase text-slate-500">Contents</p>
              <ul className="mt-0.5 space-y-0.5">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="mt-[1px] inline-block h-2.5 w-2.5 shrink-0 border border-slate-500" />
                    <span>
                      {item.name} × {item.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-2 rounded border-2 border-slate-900 p-1.5 text-center">
              {shipment.courier === 'rider' ? (
                <p className="font-bold">INSTANT RIDER · {collect ? `COLLECT ${formatRupees(collect)} + rider fare` : 'PAID · rider fare only'}</p>
              ) : collect ? (
                <p className="text-base font-bold">COD · COLLECT {formatRupees(collect)}</p>
              ) : (
                <p className="text-base font-bold">PREPAID · DO NOT COLLECT CASH</p>
              )}
            </div>

            <footer className="mt-2 border-t border-slate-200 pt-1.5 text-center text-[9px] text-slate-600">
              <p className="font-semibold text-slate-900">Handle with care: contains batteries. Do not crush, puncture or wet.</p>
              <p className="mt-0.5">Thank you for shopping with Battery HUB. Problem with your order? WhatsApp {WHATSAPP_DISPLAY_NUMBER}.</p>
            </footer>
          </section>
        );
      })}
    </main>
  );
}
