'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setRequestStatus, type AdminQuoteRequest, type AdminStockAlert } from '@/app/admin/backend-actions';
import { SITE_URL } from '@/config/store';
import { whatsAppTo } from '@/lib/customer-messages';
import { Button } from '@/components/ui/Button';

const when = (iso: string) => new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const waClass = 'rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-500';

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      if ((await fn()).ok) router.refresh();
    });
  return { pending, run };
}

export function StockAlertList({ alerts, productLinks }: { alerts: AdminStockAlert[]; productLinks: Record<string, string> }) {
  const { pending, run } = useAction();
  if (alerts.length === 0) return <p className="text-sm text-slate-500">No one is waiting for a restock.</p>;

  const byProduct = new Map<string, AdminStockAlert[]>();
  for (const a of alerts) byProduct.set(a.productId, [...(byProduct.get(a.productId) ?? []), a]);

  return (
    <div className="space-y-3">
      {Array.from(byProduct).map(([productId, list]) => {
        const link = productLinks[productId] ? `${SITE_URL}${productLinks[productId]}` : SITE_URL;
        return (
          <div key={productId} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-950">
              {list[0].productName} <span className="text-sm font-normal text-slate-500">· {list.length} waiting</span>
            </p>
            <ul className="mt-2 divide-y divide-slate-100">
              {list.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {a.name ? `${a.name} · ` : ''}
                    {a.contactPhone} <span className="text-xs text-slate-400">· {when(a.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <a
                      href={whatsAppTo(
                        a.contactPhone,
                        `Assalam o Alaikum, good news from Battery HUB: ${a.productName} is back in stock. Order here: ${link}`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={waClass}
                    >
                      WhatsApp: back in stock
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => setRequestStatus(a.id, { kind: 'alert', productId, status: 'notified' }))}
                    >
                      Mark notified
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function QuoteRequestList({ quotes }: { quotes: AdminQuoteRequest[] }) {
  const { pending, run } = useAction();
  if (quotes.length === 0) return <p className="text-sm text-slate-500">No bulk quote requests yet.</p>;
  return (
    <div className="space-y-3">
      {quotes.map((q) => (
        <div key={q.id} className={`rounded-xl border bg-white p-4 ${q.status === 'done' ? 'border-slate-200 opacity-60' : 'border-blue-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-950">
                {q.name}
                {q.organization ? ` · ${q.organization}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                {q.contactPhone} · {q.city} · {when(q.createdAt)}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${q.status === 'done' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-900'}`}>
              {q.status === 'done' ? 'done' : 'new'}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{q.details}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={whatsAppTo(q.contactPhone, `Assalam o Alaikum ${q.name.split(' ')[0]}, thank you for your bulk order request on Battery HUB. Here is your quote:\n`)}
              target="_blank"
              rel="noopener noreferrer"
              className={waClass}
            >
              Reply on WhatsApp
            </a>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setRequestStatus(q.id, { kind: 'quote', status: q.status === 'done' ? 'new' : 'done' }))}
            >
              {q.status === 'done' ? 'Reopen' : 'Mark done'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
