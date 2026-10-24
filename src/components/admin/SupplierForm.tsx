'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveSupplier, type SupplierRecord } from '@/app/admin/backend-actions';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/admin/TextField';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save supplier'}
    </Button>
  );
}

export function SupplierForm({ supplier }: { supplier?: SupplierRecord }) {
  const [state, action] = useFormState(saveSupplier, undefined);
  const location = supplier?.locations.find((l) => l.isDefault) ?? supplier?.locations[0];

  return (
    <form action={action} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="id" value={supplier?.id ?? 'main-supplier'} />
      <TextField label="Supplier or shop name" name="name" required minLength={2} maxLength={100} defaultValue={supplier?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Contact person (optional)" name="contactName" maxLength={80} defaultValue={supplier?.contactName} />
        <TextField label="Shop phone (optional)" name="phone" type="tel" placeholder="0300 1234567" defaultValue={supplier?.phone} />
      </div>
      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
          Pickup address
        </label>
        <textarea
          id="address"
          name="address"
          required
          minLength={10}
          maxLength={300}
          rows={3}
          defaultValue={location?.address}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cityId" className="mb-1 block text-sm font-medium text-slate-700">
            Pickup city
          </label>
          <select
            id="cityId"
            name="cityId"
            defaultValue={location?.cityId ?? 'rawalpindi'}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
          >
            <option value="rawalpindi">Rawalpindi</option>
            <option value="islamabad">Islamabad</option>
          </select>
        </div>
        <TextField label="Pickup hours (optional)" name="pickupHours" placeholder="11am to 7pm, Mon to Sat" maxLength={100} defaultValue={location?.pickupHours} />
      </div>
      <TextField
        label="Trax pickup address ID (add when Trax gives it)"
        name="traxPickupAddressId"
        inputMode="numeric"
        defaultValue={location?.traxPickupAddressId?.toString()}
      />
      <div className="flex items-center gap-3">
        <SaveButton />
        {state && <p className={state.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>{state.message}</p>}
      </div>
    </form>
  );
}
