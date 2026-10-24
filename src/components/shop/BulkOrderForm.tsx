'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { requestQuote } from '@/app/(store)/requests/actions';

const input =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Request a quote
    </button>
  );
}

export function BulkOrderForm() {
  const [state, action] = useFormState(requestQuote, undefined);
  if (state?.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Your name</span>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">WhatsApp number</span>
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Company / university <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <input name="organization" maxLength={120} autoComplete="organization" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">City</span>
        <input name="city" required minLength={2} maxLength={60} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-semibold text-slate-700">What do you need?</span>
        <textarea
          name="details"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={'e.g. 50 × 18650 2600mAh cells, 20 × TP4056 modules, 10 × 12V 5A adapters'}
          className={`${input} h-auto py-2`}
        />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit />
        {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
      </div>
    </form>
  );
}
