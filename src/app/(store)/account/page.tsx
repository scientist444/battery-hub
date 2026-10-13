import Link from 'next/link';
import { MessageCircle, PackageSearch, UserRound } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

export default function AccountPage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <UserRound className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">WhatsApp Support</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Account login is not active because Battery HUB is currently taking orders through
            WhatsApp only for Islamabad &amp; Rawalpindi.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to ask about my order or product availability.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Contact WhatsApp
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <PackageSearch className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
