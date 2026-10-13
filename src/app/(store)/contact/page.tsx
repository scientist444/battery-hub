import Link from 'next/link';
import { Calculator, MapPin, MessageCircle, Phone } from 'lucide-react';
import { OWNERS, SERVICE_AREA, WHATSAPP_DISPLAY_NUMBER, createWhatsAppLink } from '@/config/store';

export default function ContactPage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom">
        <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
          <section>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Contact</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Order Through WhatsApp</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Battery HUB is currently serving Islamabad &amp; Rawalpindi only. Send the product
              name, required voltage, current, connector type, and project details on WhatsApp so we
              can confirm price and availability.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={createWhatsAppLink('Assalam o Alaikum, I want to place an order.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Order
              </a>
              <Link
                href="/calculator"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Calculator className="h-4 w-4" />
                Use Calculator
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Contact Details</h2>
            <div className="mt-5 grid gap-4">
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                <MessageCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-black text-slate-950">WhatsApp</p>
                  <p className="mt-1 text-sm text-slate-600">{WHATSAPP_DISPLAY_NUMBER}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-black text-slate-950">Service Area</p>
                  <p className="mt-1 text-sm text-slate-600">{SERVICE_AREA}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                <Phone className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-black text-slate-950">Order Method</p>
                  <p className="mt-1 text-sm text-slate-600">Orders confirmed through WhatsApp only.</p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Owners</p>
                <p className="mt-1 text-sm text-slate-600">{OWNERS.join(' & ')}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-slate-950">Before You Message</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Product name', 'Required voltage', 'Current/load details', 'Connector type'].map((item) => (
              <div key={item} className="rounded-lg bg-white p-4 text-sm font-bold text-slate-800">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
