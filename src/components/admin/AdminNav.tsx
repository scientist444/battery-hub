'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ExternalLink, Inbox, LogOut, MoreHorizontal, Package, ShoppingBag, Star, Store, Truck, X } from 'lucide-react';
import { logout } from '@/app/admin/actions';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, backend: true, tab: true },
  { href: '/admin', label: 'Products', icon: Package, backend: false, tab: true },
  { href: '/admin/requests', label: 'Requests', icon: Inbox, backend: true, tab: true },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, backend: true, tab: true },
  { href: '/admin/supplier', label: 'Supplier', icon: Store, backend: true, tab: false },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck, backend: true, tab: false },
  { href: '/admin/app', label: 'Phone app', icon: Bell, backend: true, tab: false },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' || pathname.startsWith('/admin/products') : pathname.startsWith(href);
}

/** Desktop: links in the header. Phones (Android and iPhone): a bottom tab bar with the rest under "More". */
export function AdminNav({ backendEnabled }: { backendEnabled: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const links = LINKS.filter((l) => backendEnabled || !l.backend);
  const tabs = links.filter((l) => l.tab);
  const more = links.filter((l) => !l.tab);
  const moreActive = more.some((l) => isActive(pathname, l.href));

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      <nav className="hidden items-center gap-4 text-sm font-medium lg:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn('hover:text-slate-950', isActive(pathname, l.href) ? 'text-slate-950' : 'text-slate-600')}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="p-2 text-slate-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {more.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center gap-3 py-3.5 text-base font-medium text-slate-900">
                    <l.icon className="h-5 w-5 text-slate-500" /> {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/" target="_blank" className="flex items-center gap-3 py-3.5 text-base font-medium text-slate-900">
                  <ExternalLink className="h-5 w-5 text-slate-500" /> View store
                </Link>
              </li>
              <li>
                <form action={logout}>
                  <button type="submit" className="flex w-full items-center gap-3 py-3.5 text-base font-medium text-red-600">
                    <LogOut className="h-5 w-5" /> Sign out
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="flex">
          {tabs.map((l) => {
            const active = isActive(pathname, l.href) && !moreOpen;
            return (
              <li key={l.href} className="flex-1">
                <Link
                  href={l.href}
                  className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-slate-950' : 'text-slate-500')}
                >
                  <l.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {l.label}
                </Link>
              </li>
            );
          })}
          {more.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  moreOpen || moreActive ? 'text-slate-950' : 'text-slate-500',
                )}
                aria-expanded={moreOpen}
              >
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
