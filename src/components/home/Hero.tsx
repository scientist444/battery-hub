import Link from 'next/link';
import { BatteryCharging, Calculator, CheckCircle2, MessageCircle } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

const customBatteryItems = [
  'Required voltage',
  'Capacity or backup time',
  'Load current or device details',
  'Connector and size requirements',
];

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 lg:py-18">
      <div className="container-custom grid gap-10 lg:grid-cols-2 lg:items-center lg:py-6">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
            For Students · Makers · IoT Builders
          </p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
            Find the Right{' '}
            <span className="text-blue-600">Power Solution</span>{' '}
            for Your Project
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            Shop batteries, chargers, adapters, and power supplies for student projects, robotics,
            IoT devices, and electronics work.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              Shop All Products
            </Link>
            <a
              href={createWhatsAppLink(
                'Assalam o Alaikum, I need guidance for a battery or power product.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <MessageCircle className="h-4 w-4" />
              Ask on WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/8">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Custom Battery Guidance
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                Made to your requirements
              </p>
            </div>
            <BatteryCharging className="h-9 w-9 text-emerald-500" />
          </div>

          <p className="text-sm leading-6 text-slate-600">
            Need a specific mAh, voltage, size, or connector? Share your project details and we
            will guide you to the right capacity, voltage, and charger.
          </p>

          <div className="mt-4 space-y-2">
            {customBatteryItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
              >
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-500" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Calculator className="h-4 w-4" />
              Calculate First
            </Link>
            <a
              href={createWhatsAppLink(
                'Assalam o Alaikum, I need a custom battery. I can share voltage, capacity, backup time, load current, and connector details.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" />
              Ask Directly
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
