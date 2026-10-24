'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, MessageCircle, Search, ShoppingCart, UserRound, X } from 'lucide-react';
import { STORE_CATEGORIES, createWhatsAppLink } from '@/config/store';
import { products } from '@/data/products';
import { useCart } from '@/context/CartContext';

const availableStoreCategories = STORE_CATEGORIES.filter((category) =>
  products.some((product) => product.category === category.id),
);

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'All Products', href: '/products', exact: true },
  ...availableStoreCategories,
  { label: 'Battery Calculator', href: '/calculator' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar({ topBar }: { topBar: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="bg-slate-950 text-white">
        <div className="container-custom py-2 text-center text-xs font-semibold text-slate-200">
          {topBar}
        </div>
      </div>

      <div className="container-custom">
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 py-3 lg:grid-cols-[220px,1fr,auto] lg:gap-5">
          <Link href="/" className="flex items-center gap-2" aria-label="Battery HUB home">
            <Image
              src="/BH LOGO.png"
              alt="Battery HUB logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-contain"
              priority
            />
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-slate-950">Battery HUB</span>
              <span className="hidden text-xs text-slate-500 sm:block">Power solutions</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search batteries, chargers, adapters, power supplies..."
              className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
            />
          </form>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/account"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100"
              aria-label="My account"
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to ask about Battery HUB products.')}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 sm:flex"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <form onSubmit={submitSearch} className="relative pb-3 md:hidden">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-[calc(50%+0.375rem)] text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search batteries, chargers, adapters..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none focus:border-slate-950 focus:bg-white"
          />
        </form>
      </div>

      <nav className="hidden border-t border-slate-100 bg-white lg:block">
        <div className="container-custom flex items-center gap-1 overflow-x-auto py-2">
          {navLinks.map((link) => {
            const isActive = link.href === '/' || ('exact' in link && link.exact) ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {isMobileMenuOpen && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="grid gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {itemCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to ask about Battery HUB products.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-3 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
