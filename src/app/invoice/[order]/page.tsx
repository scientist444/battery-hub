import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Invoice } from '@/components/invoice/Invoice';
import { PrintButton } from '@/components/invoice/PrintButton';
import { getOrderByNumber, verifyInvoiceToken } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };

export default async function InvoicePage({ params, searchParams }: { params: { order: string }; searchParams: { t?: string } }) {
  const orderNumber = decodeURIComponent(params.order).toUpperCase();
  if (!verifyInvoiceToken(orderNumber, searchParams.t)) notFound();
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{'@page { size: A4; margin: 14mm; }'}</style>
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
        <Link href="/" className="text-sm font-semibold text-blue-700">
          ← Battery HUB
        </Link>
        <PrintButton />
      </div>
      <div className="shadow-sm print:shadow-none">
        <Invoice order={order} />
      </div>
      <p className="mx-auto mt-3 max-w-3xl px-4 text-center text-xs text-slate-500 print:hidden">
        To download, click the button and choose &ldquo;Save as PDF&rdquo; as the printer.
      </p>
    </main>
  );
}
