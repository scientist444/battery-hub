import Link from 'next/link';
import { Calculator, MessageCircle } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

export default function CustomGuidancePage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom">
        <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Custom guidance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">
            Need Help Choosing the Right Battery?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Share your voltage, current, backup time, connector type, and project details with us on
            WhatsApp. We will guide you about suitable battery capacity, charger rating, adapter, or
            power supply options.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I need help choosing the right battery or power product.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Ask on WhatsApp
            </a>
            <Link
              href="/calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <Calculator className="h-4 w-4" />
              Use Calculator
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Buying in quantity for a business, lab or student group?{' '}
            <Link href="/bulk-order" className="font-semibold text-blue-700 hover:underline">
              Request a bulk quote
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
