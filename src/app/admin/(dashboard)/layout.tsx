import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-session';
import { logout } from '@/app/admin/actions';
import { isBackendAdminEnabled } from '@/lib/backend';
import { AdminAppRegister } from '@/components/admin/AdminAppRegister';
import { AdminNav } from '@/components/admin/AdminNav';
import { RefreshButton } from '@/components/admin/RefreshButton';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <>
      <AdminAppRegister />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] lg:static">
        <div className="container-custom flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/BH LOGO.png" alt="" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
            <span className="text-sm font-bold text-slate-950">Battery HUB Admin</span>
          </Link>
          <AdminNav backendEnabled={isBackendAdminEnabled()} />
          <div className="flex items-center gap-4 text-sm">
            <RefreshButton />
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-slate-600 hover:text-slate-950 lg:flex">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <span className="hidden text-slate-400 lg:inline">{session.username}</span>
            <form action={logout} className="hidden lg:block">
              <button type="submit" className="flex items-center gap-1 text-slate-600 hover:text-red-600">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {/* Room for the bottom tab bar on phones. */}
      <main className="container-custom py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:py-8">{children}</main>
    </>
  );
}
