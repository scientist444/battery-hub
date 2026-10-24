import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { isBackendAdminEnabled } from '@/lib/backend';
import { getSuppliers, type SupplierRecord } from '@/app/admin/backend-actions';
import { SupplierForm } from '@/components/admin/SupplierForm';

export const metadata: Metadata = { title: 'Supplier' };
export const dynamic = 'force-dynamic';

export default async function SupplierPage() {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');

  let supplier: SupplierRecord | undefined;
  let loadError: string | undefined;
  try {
    supplier = (await getSuppliers())[0];
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load the supplier.';
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-950">Supplier pickup</h1>
      <p className="mt-1 text-sm text-slate-500">
        Where the courier collects parcels. This is stored only in your private backend and is never shown to customers.
      </p>
      {loadError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <SupplierForm supplier={supplier} />
    </div>
  );
}
