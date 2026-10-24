import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TrackOrder } from '@/components/shop/TrackOrder';
import { isCheckoutEnabled } from '@/lib/backend';

export const metadata: Metadata = { title: 'Track your order' };
export const dynamic = 'force-dynamic';

export default function TrackPage({ searchParams }: { searchParams: { order?: string } }) {
  if (!isCheckoutEnabled()) redirect('/contact');
  return (
    <div className="min-h-[60vh] bg-slate-50 py-10 lg:py-14">
      <div className="container-custom max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950">Track your order</h1>
        <p className="mb-6 text-sm text-slate-500">Enter your order number and the mobile number you ordered with.</p>
        <TrackOrder initialOrder={searchParams.order ?? ''} />
      </div>
    </div>
  );
}
