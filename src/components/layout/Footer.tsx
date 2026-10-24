import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, MapPin } from 'lucide-react';
import {
  OWNER,
  type DeliveryCopy,
  STORE_CATEGORIES,
  WHATSAPP_DISPLAY_NUMBER,
  createWhatsAppLink,
} from '@/config/store';
import { products } from '@/data/products';

const supportLinks = [
  { label: 'How to Order', href: '/contact' },
  { label: 'Battery Safety Guide', href: '/blog' },
  { label: 'Contact', href: '/contact' },
  { label: 'WhatsApp Order', href: createWhatsAppLink('Assalam o Alaikum, I want to place an order.') },
];

export default function Footer({ copy }: { copy: DeliveryCopy }) {
  const availableCategories = STORE_CATEGORIES.filter((category) =>
    products.some((product) => product.category === category.id),
  );

  return (
    <footer className="bg-slate-950 text-white">
      <div className="container-custom grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.35fr,1fr,1fr,1.15fr]">
        <div>
          <Link href="/" className="mb-4 flex items-center gap-2">
            <Image
              src="/BH LOGO.png"
              alt="Battery HUB logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-contain"
            />
            <span className="text-xl font-black">Battery HUB</span>
          </Link>
          <p className="max-w-sm text-sm leading-6 text-slate-300">
            Battery and power solutions for projects, students, and electronics users.{' '}
            {copy.collectionNote}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-400">
            Owner: {OWNER}
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-200">Categories</h3>
          <ul className="space-y-3">
            {availableCategories.map((link) => (
              <li key={link.id}>
                <Link href={link.href} className="text-sm text-slate-400 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-200">Support</h3>
          <ul className="space-y-3">
            {[...(copy.trackOrders ? [{ label: 'Track your order', href: '/track' }] : []), ...supportLinks].map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-slate-400 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-200">Contact</h3>
          <div className="space-y-3 text-sm text-slate-400">
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to place an order.')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 transition hover:text-emerald-300"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              WhatsApp: {WHATSAPP_DISPLAY_NUMBER}
            </a>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-300" />
              Service Area: {copy.serviceArea}
            </div>
            <p>{copy.orderMethod}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="container-custom py-5 text-xs text-slate-500">
          Copyright 2026 Battery HUB. {copy.footerNote}
        </div>
      </div>
    </footer>
  );
}
