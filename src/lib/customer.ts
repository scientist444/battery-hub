import { cookies } from 'next/headers';
import { BackendError, backendFetch } from '@/lib/backend';
import { CUSTOMER_COOKIE, verifyCustomerToken } from '@/lib/customer-session';
import type { TrackedOrder } from '@/app/(store)/checkout/actions';

export interface CustomerAccount {
  email: string;
  name: string;
  mobile?: string;
  address?: { cityId: string; address: string; landmark?: string };
}

export function getCustomerSession() {
  return verifyCustomerToken(cookies().get(CUSTOMER_COOKIE)?.value);
}

/** Saved profile, or undefined before the customer saves one. */
export async function getAccount(accountId: string) {
  try {
    const { account } = await backendFetch<{ account: CustomerAccount }>('storefront', 'customer/account', { query: { accountId } });
    return account;
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return undefined;
    throw error;
  }
}

export async function getOrderHistory(accountId: string) {
  const { orders } = await backendFetch<{ orders: TrackedOrder[] }>('storefront', 'customer/orders', { query: { accountId } });
  return orders;
}
