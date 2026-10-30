import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-session';
import { logout } from '@/app/admin/actions';
import { isBackendAdminEnabled } from '@/lib/backend';
import { AdminAppRegister } from '@/components/admin/AdminAppRegister';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <>
      <AdminAppRegister />
      <header className="border-b border-slate-200 bg-white">
        <div className="container-custom flex flex-wrap items-center justify-between gap-x-4 sm:h-14 sm:flex-nowrap">
          <Link href="/admin" className="flex h-14 items-center gap-2 sm:h-auto">
            <Image src="/BH LOGO.png" alt="" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
            <span className="text-sm font-bold text-slate-950">Battery HUB Admin</span>
          </Link>
          {/* On phones the links get their own row, which scrolls sideways. */}
          <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-5 overflow-x-auto whitespace-nowrap border-t border-slate-100 px-4 py-3 text-sm font-medium sm:order-none sm:mx-0 sm:w-auto sm:gap-4 sm:border-0 sm:p-0">
            <Link href="/admin" className="text-slate-600 hover:text-slate-950">Products</Link>
            {isBackendAdminEnabled() && (
              <>
                <Link href="/admin/orders" className="text-slate-600 hover:text-slate-950">Orders</Link>
                <Link href="/admin/app" className="text-slate-600 hover:text-slate-950">Phone app</Link>
                <Link href="/admin/reviews" className="text-slate-600 hover:text-slate-950">Reviews</Link>
                <Link href="/admin/requests" className="text-slate-600 hover:text-slate-950">Requests</Link>
                <Link href="/admin/supplier" className="text-slate-600 hover:text-slate-950">Supplier</Link>
                <Link href="/admin/delivery" className="text-slate-600 hover:text-slate-950">Delivery</Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-slate-600 hover:text-slate-950 sm:flex">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <span className="hidden text-slate-400 sm:inline">{session.username}</span>
            <form action={logout}>
              <button type="submit" className="flex items-center gap-1 text-slate-600 hover:text-red-600">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container-custom py-6 sm:py-8">{children}</main>
    </>
  );
}
