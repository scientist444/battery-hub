import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { isBackendAdminEnabled } from '@/lib/backend';
import { getReviews, type AdminReview } from '@/app/admin/backend-actions';
import { ReviewModeration } from '@/components/admin/ReviewModeration';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Reviews' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  ['pending', 'To check'],
  ['approved', 'Published'],
  ['hidden', 'Hidden'],
  ['', 'All'],
] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireAdmin();
  if (!isBackendAdminEnabled()) redirect('/admin');
  const status = searchParams.status ?? 'pending';

  let reviews: AdminReview[] = [];
  let loadError: string | undefined;
  try {
    reviews = await getReviews(status || undefined);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load reviews.';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Reviews</h1>
      <p className="mt-1 text-sm text-slate-500">
        Customers can review a product once their order with it is delivered. New reviews show on the website after you publish them.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value || 'all'}
            href={`/admin/reviews?status=${value}`}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              status === value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-950',
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {loadError ? <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : <ReviewModeration reviews={reviews} />}
    </div>
  );
}
