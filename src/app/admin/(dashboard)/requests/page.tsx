import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { apiProductId, isBackendAdminEnabled } from '@/lib/backend';
import { getCatalog } from '@/lib/catalog';
import { getRequests, type AdminQuoteRequest, type AdminStockAlert } from '@/app/admin/backend-actions';
import { QuoteRequestList, StockAlertList } from '@/components/admin/RequestLists';

export const metadata: Metadata = { title: 'Requests' };
export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');

  let alerts: AdminStockAlert[] = [];
  let quotes: AdminQuoteRequest[] = [];
  let loadError: string | undefined;
  try {
    ({ alerts, quotes } = await getRequests());
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load requests.';
  }
  const productLinks = Object.fromEntries((await getCatalog()).map((p) => [apiProductId(p.id), `/products/${p.slug}`]));

  return (
    <div className="space-y-10">
      {loadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <section>
        <h1 className="text-2xl font-bold text-slate-950">Bulk quote requests</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">From the Bulk & wholesale page. Reply on WhatsApp with prices, then mark it done.</p>
        <QuoteRequestList quotes={quotes} />
      </section>
      <section>
        <h2 className="text-2xl font-bold text-slate-950">Waiting for restock</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Customers who asked to be told when a sold-out product is back. After you restock, message them and mark them notified.
        </p>
        <StockAlertList alerts={alerts} productLinks={productLinks} />
      </section>
    </div>
  );
}
