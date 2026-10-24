'use client';

import { useState, useTransition } from 'react';
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { requestStockAlert } from '@/app/(store)/requests/actions';

/** "Notify me" for sold-out products: the admin sees the request and messages the customer on restock. */
export function NotifyMe({ productId, productName }: { productId: string; productName: string }) {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [pending, start] = useTransition();

  if (result?.ok) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {result.message}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await requestStockAlert({ productId, productName, phone })));
      }}
      className="rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
        <BellRing className="h-4 w-4 text-blue-700" /> Notify me when it&apos;s back
      </p>
      <div className="mt-2 flex gap-2">
        <input
          required
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number, e.g. 0300 1234567"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Notify me
        </button>
      </div>
      {result && !result.ok && <p className="mt-2 text-sm text-red-700">{result.message}</p>}
    </form>
  );
}
