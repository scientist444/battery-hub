import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { OWNERS, createWhatsAppLink } from '@/config/store';

export default function AboutPage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom">
        <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">About Battery HUB</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Battery and Power Solutions for Local Projects
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Battery HUB helps students, robotics project builders, IoT developers, electronics
            hobbyists, and small project makers choose suitable batteries, chargers, adapters, and
            power supplies. We are currently operating only in Islamabad and Rawalpindi, with orders
            confirmed through WhatsApp.
          </p>
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">Owners</p>
            <p className="mt-1 text-sm text-slate-600">{OWNERS.join(' & ')}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to ask about Battery HUB products.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Ask on WhatsApp
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
