import type { Metadata } from 'next';
import { Building2, GraduationCap, MessageCircle, Truck } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';
import { isCheckoutEnabled } from '@/lib/backend';
import { BulkOrderForm } from '@/components/shop/BulkOrderForm';

export const metadata: Metadata = {
  title: 'Bulk & wholesale orders',
  description: 'Quotes for bulk batteries, chargers, adapters and power supplies for businesses, universities, labs and student groups across Pakistan.',
};

const perks = [
  { icon: Building2, title: 'Businesses & shops', text: 'Better prices on larger quantities and repeat orders.' },
  { icon: GraduationCap, title: 'Universities & student groups', text: 'Kits for labs, FYPs and robotics teams.' },
  { icon: Truck, title: 'Delivered nationwide', text: 'One shipment to your city, cash on delivery or advance payment.' },
];

export default function BulkOrderPage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom max-w-4xl">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Bulk & wholesale</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">Get a quote for bulk orders</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Tell us what you need and how many. We reply on WhatsApp with prices and delivery, usually within one working day.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <Icon className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-bold text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {isCheckoutEnabled() ? (
            <BulkOrderForm />
          ) : (
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want a quote for a bulk order.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Ask for a quote on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
