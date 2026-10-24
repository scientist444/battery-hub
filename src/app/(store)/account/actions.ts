'use server';

import { revalidatePath } from 'next/cache';
import { BackendError, backendFetch } from '@/lib/backend';
import { getCustomerSession } from '@/lib/customer';

export interface SaveAccountState {
  ok: boolean;
  message: string;
}

export async function saveAccount(_prev: SaveAccountState | undefined, formData: FormData): Promise<SaveAccountState> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, message: 'Please sign in again.' };
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  const address = text('address');

  try {
    await backendFetch('storefront', 'customer/account', {
      method: 'PUT',
      body: {
        accountId: session.accountId,
        email: session.email,
        name: text('name'),
        mobile: text('mobile'),
        address: address || text('cityId') ? { cityId: text('cityId'), address, landmark: text('landmark') || undefined } : undefined,
      },
    });
  } catch (error) {
    if (error instanceof BackendError) {
      const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
      const field = details?.fieldErrors && Object.values(details.fieldErrors).flat()[0];
      return { ok: false, message: field ?? error.message };
    }
    return { ok: false, message: 'Could not save. Please try again.' };
  }
  revalidatePath('/account');
  return { ok: true, message: 'Saved. These details will fill in checkout for you.' };
}
