'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { saveCourierSettings, syncTraxCities, testTraxRate, type CourierSettings, type TraxCheck, type TraxRateTest } from '@/app/admin/backend-actions';
import { Button } from '@/components/ui/Button';

function Failure({ error, responseKeys }: { error: string; responseKeys?: string[] }) {
  return (
    <span className="text-red-700">
      {error}
      {responseKeys && <span className="block text-xs text-slate-500">Trax replied with fields: {responseKeys.join(', ')}</span>}
    </span>
  );
}

export function TraxStatus({ check }: { check: TraxCheck }) {
  const { cities, pickupAddresses } = check;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p>
        <span className="font-semibold text-slate-950">API key: </span>
        {cities.ok ? <span className="text-emerald-700">Working. Trax returned {cities.value} cities.</span> : <Failure {...cities} />}
      </p>
      <div>
        <p className="font-semibold text-slate-950">Pickup addresses in your Trax account</p>
        {!pickupAddresses.ok ? (
          <Failure {...pickupAddresses} />
        ) : pickupAddresses.value.length === 0 ? (
          <p className="text-slate-500">None yet. Add the supplier&apos;s shop as a pickup address in the Trax portal, then reload this page.</p>
        ) : (
          <>
            <ul className="mt-1 divide-y divide-slate-100">
              {pickupAddresses.value.map((a) => (
                <li key={a.id} className="flex gap-3 py-1.5">
                  <span className="w-20 shrink-0 font-mono font-semibold">{a.id}</span>
                  <span className="text-slate-600">{a.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-slate-500">Copy the supplier&apos;s ID into Supplier → Trax pickup address ID.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function SyncCitiesButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={pending} onClick={() => start(async () => setResult(await syncTraxCities()))}>
        <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Sync cities from Trax
      </Button>
      {result && <span className={result.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>{result.message}</span>}
    </div>
  );
}

export function CourierSettingsForm({ settings }: { settings: CourierSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [courierMode, setCourierMode] = useState(settings.courierMode);
  const [autoBook, setAutoBook] = useState(settings.autoBook);
  const [services, setServices] = useState(settings.services);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  const updateService = (code: string, patch: Partial<CourierSettings['services'][number]>) =>
    setServices((list) => list.map((s) => (s.code === code ? { ...s, ...patch } : s)));

  const save = () =>
    start(async () => {
      const r = await saveCourierSettings({ courierMode, autoBook: courierMode === 'trax' && autoBook, services });
      setResult(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <fieldset className="space-y-2">
        <legend className="font-semibold text-slate-950">Delivery charges and booking</legend>
        <label className="flex items-start gap-2">
          <input type="radio" name="courierMode" checked={courierMode === 'flat'} onChange={() => setCourierMode('flat')} className="mt-1" />
          <span>
            <span className="font-medium">Flat fees</span>, book manually in the Trax portal and paste the tracking number in Orders.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name="courierMode" checked={courierMode === 'trax'} onChange={() => setCourierMode('trax')} className="mt-1" />
          <span>
            <span className="font-medium">Trax live rates</span>, checkout asks Trax for the charge and admin can book with one click.
          </span>
        </label>
        <label className={courierMode === 'trax' ? 'flex items-center gap-2 pl-6' : 'flex items-center gap-2 pl-6 opacity-50'}>
          <input type="checkbox" checked={autoBook} disabled={courierMode !== 'trax'} onChange={(e) => setAutoBook(e.target.checked)} />
          Book with Trax automatically when I confirm an order
        </label>
      </fieldset>

      <div>
        <p className="font-semibold text-slate-950">Trax services</p>
        <p className="text-xs text-slate-500">Turn off any service your account doesn&apos;t have. The ID is Trax&apos;s shipping mode ID for that service.</p>
        <table className="mt-2 w-full max-w-md text-left">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 font-medium">On</th>
              <th className="py-1 font-medium">Service</th>
              <th className="py-1 font-medium">Trax ID</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.code}>
                <td className="py-1">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => updateService(s.code, { enabled: e.target.checked })} />
                </td>
                <td className="py-1">{s.name}</td>
                <td className="py-1">
                  <input
                    type="number"
                    min={0}
                    value={s.courierId ?? ''}
                    onChange={(e) => updateService(s.code, { courierId: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={save}>
          Save
        </Button>
        {result && <span className={result.ok ? 'text-emerald-700' : 'text-red-700'}>{result.message}</span>}
      </div>
    </div>
  );
}

const TEST_CITIES = [
  ['islamabad', 'Islamabad'],
  ['lahore', 'Lahore'],
  ['karachi', 'Karachi'],
  ['peshawar', 'Peshawar'],
  ['multan', 'Multan'],
  ['quetta', 'Quetta'],
] as const;

export function TraxRateTester() {
  const [pending, start] = useTransition();
  const [cityId, setCityId] = useState<string>('lahore');
  const [weightKg, setWeightKg] = useState('1');
  const [test, setTest] = useState<TraxRateTest>();
  const [error, setError] = useState<string>();

  const run = () =>
    start(async () => {
      const r = await testTraxRate(cityId, Math.round(Number(weightKg) * 1000));
      setTest(r.ok ? r.test : undefined);
      setError(r.ok ? undefined : r.message);
    });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-xs text-slate-500">From Rawalpindi to</span>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5">
            {TEST_CITIES.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-500">Weight (kg)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <Button variant="outline" disabled={pending || !(Number(weightKg) > 0)} onClick={run}>
          <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Get Trax rates
        </Button>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {test && (
        <ul className="divide-y divide-slate-100">
          {test.rates.map((r) => (
            <li key={r.code} className="flex gap-3 py-1.5">
              <span className="w-28 shrink-0 font-medium">
                {r.name} <span className="text-xs text-slate-400">(ID {r.courierId ?? '-'})</span>
              </span>
              <span className="min-w-0">
                {r.result.ok ? <span className="text-emerald-700">Rs {r.result.value}</span> : <Failure {...r.result} />}
                {r.details && <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-slate-500">{JSON.stringify(r.details)}</pre>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {test && (
        <div>
          <p className="font-semibold text-slate-950">Trax shipping modes</p>
          {test.shippingModes.ok ? (
            <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-slate-600">{JSON.stringify(test.shippingModes.value)}</pre>
          ) : (
            <Failure {...test.shippingModes} />
          )}
        </div>
      )}
    </div>
  );
}
