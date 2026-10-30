import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { isBackendAdminEnabled } from '@/lib/backend';
import { PhoneAppSetup } from '@/components/admin/PhoneAppSetup';

export const metadata: Metadata = { title: 'Phone app' };
export const dynamic = 'force-dynamic';

export default async function PhoneAppPage() {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-950">Phone app</h1>
      <p className="mt-1 text-sm text-slate-500">Install the admin on your phone and get a notification for every new order.</p>
      <div className="mt-6">
        <PhoneAppSetup />
      </div>
    </div>
  );
}
