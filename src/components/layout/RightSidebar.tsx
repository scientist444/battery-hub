'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Battery,
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plug,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

const categories = [
  { label: 'Batteries', href: '/products/batteries', icon: Battery },
  { label: 'Chargers', href: '/products/chargers', icon: BatteryCharging },
  { label: 'Power Supplies', href: '/products/power-supplies', icon: Power },
  { label: 'Adapters', href: '/products/adapters', icon: Plug },
  { label: 'BMS Boards', href: '/products/bms-boards', icon: ShieldCheck },
];

export default function RightSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2 hidden lg:block">
      <div
        className={`flex flex-col overflow-hidden rounded-l-xl border border-r-0 border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-all duration-300 ${
          expanded ? 'w-40' : 'w-12'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse' : 'Quick Categories'}
          className="flex h-9 w-full items-center justify-center bg-blue-600 text-white transition hover:bg-blue-700"
        >
          {expanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {categories.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="flex h-11 items-center gap-3 border-t border-slate-100 px-3 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
          >
            <Icon className="h-5 w-5 flex-none" />
            {expanded && (
              <span className="whitespace-nowrap text-xs font-bold">{label}</span>
            )}
          </Link>
        ))}

        <a
          href={createWhatsAppLink(
            'Assalam o Alaikum, I want to inquire about Battery HUB products.',
          )}
          target="_blank"
          rel="noopener noreferrer"
          title="Order on WhatsApp"
          className="flex h-11 items-center gap-3 border-t-2 border-slate-200 bg-emerald-50 px-3 text-emerald-700 transition hover:bg-emerald-100"
        >
          <MessageCircle className="h-5 w-5 flex-none" />
          {expanded && (
            <span className="whitespace-nowrap text-xs font-bold">Order Now</span>
          )}
        </a>
      </div>
    </div>
  );
}
