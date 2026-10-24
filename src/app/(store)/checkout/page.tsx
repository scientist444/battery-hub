import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { isCheckoutEnabled } from '@/lib/backend';
import { getCheckoutCities } from './actions';
import { isGoogleSignInEnabled } from '@/lib/customer-session';
import { getAccount, getCustomerSession } from '@/lib/customer';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Until the backend is connected, orders go through the cart's WhatsApp flow.
  if (!isCheckoutEnabled()) redirect('/cart');
  const cities = await getCheckoutCities();
  const session = isGoogleSignInEnabled() ? await getCustomerSession() : null;
  const account = session ? await getAccount(session.accountId).catch(() => undefined) : undefined;
  const profile = session
    ? {
        name: account?.name ?? session.name,
        phone: account?.mobile ?? '',
        email: session.email,
        cityId: account?.address?.cityId ?? '',
        address: account?.address?.address ?? '',
        landmark: account?.address?.landmark ?? '',
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-10 lg:py-14">
      <div className="container-custom">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-950">Checkout</h1>
        <CheckoutForm
          cities={cities.ok ? cities.data : []}
          citiesError={cities.ok ? undefined : cities.error}
          profile={profile}
          signInEnabled={isGoogleSignInEnabled()}
        />
      </div>
    </div>
  );
}
