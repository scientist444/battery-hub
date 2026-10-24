import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { isCheckoutEnabled } from '@/lib/backend';
import { getCheckoutCities } from './actions';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Until the backend is connected, orders go through the cart's WhatsApp flow.
  if (!isCheckoutEnabled()) redirect('/cart');
  const cities = await getCheckoutCities();

  return (
    <div className="min-h-screen bg-slate-50 py-10 lg:py-14">
      <div className="container-custom">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-950">Checkout</h1>
        <CheckoutForm cities={cities.ok ? cities.data : []} citiesError={cities.ok ? undefined : cities.error} />
      </div>
    </div>
  );
}
