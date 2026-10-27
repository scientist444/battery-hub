import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { isBackendAdminEnabled } from '@/lib/backend';
import { checkTrax, getCourierSettings, type CourierSettings, type TraxCheck } from '@/app/admin/backend-actions';
import { CourierSettingsForm, SyncCitiesButton, TraxRateTester, TraxStatus } from '@/components/admin/DeliverySettings';

export const metadata: Metadata = { title: 'Delivery' };
export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');

  let settings: CourierSettings | undefined;
  let check: TraxCheck | undefined;
  let loadError: string | undefined;
  try {
    [settings, check] = await Promise.all([getCourierSettings(), checkTrax()]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load delivery settings.';
  }

  return (
    <div className="space-y-10">
      {loadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <section>
        <h1 className="text-2xl font-bold text-slate-950">Trax connection</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Read-only checks with the API key saved in Azure. Nothing is booked here.
        </p>
        {check && <TraxStatus check={check} />}
        <div className="mt-4">
          <SyncCitiesButton />
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-slate-950">Test Trax rates</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Asks Trax what each service would charge, with Rs 5,000 cash on delivery. Nothing is booked. Sync cities first.
        </p>
        <TraxRateTester />
      </section>
      {settings && (
        <section>
          <h2 className="text-2xl font-bold text-slate-950">Courier settings</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Keep &ldquo;Flat fees&rdquo; until the cities are synced, the supplier has a Trax pickup ID, and one test booking worked.
          </p>
          <CourierSettingsForm settings={settings} />
        </section>
      )}
    </div>
  );
}
