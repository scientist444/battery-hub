'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveAccount } from '@/app/(store)/account/actions';
import type { CheckoutCity } from '@/app/(store)/checkout/actions';
import type { CustomerAccount } from '@/lib/customer';
import { Button } from '@/components/ui/Button';

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" fullWidth disabled={pending}>
      {pending ? 'Saving…' : 'Save details'}
    </Button>
  );
}

export function AccountSettingsForm({
  email,
  account,
  cities,
}: {
  email: string;
  account: Omit<CustomerAccount, 'email'>;
  cities: CheckoutCity[];
}) {
  const [state, action] = useFormState(saveAccount, undefined);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Field label="Email">
        <input value={email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
      </Field>
      <Field label="Full name">
        <input name="name" required minLength={2} maxLength={80} defaultValue={account.name} className={inputClass} />
      </Field>
      <Field label="Mobile number">
        <input name="mobile" type="tel" placeholder="0300 1234567" defaultValue={account.mobile} className={inputClass} />
      </Field>
      <Field label="City">
        <select name="cityId" defaultValue={account.address?.cityId ?? ''} className={inputClass}>
          <option value="">Select your city</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Delivery address">
        <textarea name="address" rows={3} maxLength={300} defaultValue={account.address?.address} className={`${inputClass} h-auto py-2`} />
      </Field>
      <Field label="Nearest landmark">
        <input name="landmark" maxLength={120} defaultValue={account.address?.landmark} className={inputClass} />
      </Field>
      <SaveButton />
      {state && <p className={state.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>{state.message}</p>}
    </form>
  );
}
