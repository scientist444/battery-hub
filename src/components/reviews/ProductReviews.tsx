import { BadgeCheck } from 'lucide-react';
import type { PublicReview, RatingSummary } from '@/lib/reviews';
import { Stars } from '@/components/reviews/Stars';
import { ReviewForm } from '@/components/reviews/ReviewForm';

const date = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

export function ReviewCard({ review, showProduct, productHref }: { review: PublicReview; showProduct?: boolean; productHref?: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={review.rating} />
        <span className="text-xs text-slate-400">{date(review.createdAt)}</span>
      </div>
      {review.title && <p className="mt-2 font-semibold text-slate-950">{review.title}</p>}
      <p className="mt-1 text-sm leading-6 text-slate-700">{review.body}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
        <span className="whitespace-nowrap font-semibold text-slate-800">{review.name}</span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified buyer
        </span>
        {showProduct && (
          <>
            <span aria-hidden="true">·</span>
            {productHref ? (
              <a href={productHref} className="truncate font-medium text-blue-700 hover:underline">
                {review.productName}
              </a>
            ) : (
              <span className="truncate">{review.productName}</span>
            )}
          </>
        )}
      </p>
    </article>
  );
}

/** Rating summary, reviews and the review form, at the bottom of a product page. */
export function ProductReviews({
  productId,
  summary,
  reviews,
  signInHref,
}: {
  productId: string;
  summary: RatingSummary;
  reviews: PublicReview[];
  signInHref?: string;
}) {
  return (
    <section id="reviews" className="mt-16 scroll-mt-24 border-t border-slate-200 pt-12">
      <h2 className="text-xl font-bold text-slate-950">Customer reviews</h2>
      <div className="mt-6 grid gap-8 lg:grid-cols-[280px,1fr]">
        <div>
          {summary.count > 0 ? (
            <>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-slate-950">{summary.average.toFixed(1)}</p>
                <div className="pb-1">
                  <Stars rating={summary.average} />
                  <p className="text-xs text-slate-500">
                    {summary.count} review{summary.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = summary.stars[n - 1] ?? 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-10">{n} star</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(count / summary.count) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">No reviews yet. Bought this product? Be the first to review it.</p>
          )}
          <div className="mt-5">
            <ReviewForm productId={productId} signInHref={signInHref} />
            <p className="mt-2 text-xs text-slate-500">Only customers whose order with this product was delivered can review it.</p>
          </div>
        </div>
        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
