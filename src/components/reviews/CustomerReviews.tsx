import type { ReviewsOverview } from '@/lib/reviews';
import { Stars } from '@/components/reviews/Stars';
import { ReviewCard } from '@/components/reviews/ProductReviews';

/** Home page strip of the latest approved reviews. */
export function CustomerReviews({ overview, productHref }: { overview: ReviewsOverview; productHref: (productId: string) => string | undefined }) {
  if (overview.latest.length === 0) return null;
  return (
    <section className="container-custom pb-12 lg:pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">What our customers say</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Stars rating={overview.overall.average} /> {overview.overall.average.toFixed(1)} out of 5 from {overview.overall.count} verified
            review{overview.overall.count === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overview.latest.map((review) => (
          <ReviewCard key={review.id} review={review} showProduct productHref={productHref(review.productId)} />
        ))}
      </div>
    </section>
  );
}
