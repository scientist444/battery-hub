'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewStatus, type AdminReview } from '@/app/admin/backend-actions';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/reviews/Stars';
import { cn } from '@/lib/cn';

const STATUS_STYLES = { pending: 'bg-amber-100 text-amber-900', approved: 'bg-emerald-100 text-emerald-900', hidden: 'bg-slate-200 text-slate-700' };

function ReviewRow({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string>();
  const act = (status: 'approved' | 'hidden') =>
    start(async () => {
      const result = await setReviewStatus(review.id, review.productId, status);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">{review.productName}</p>
          <p className="text-xs text-slate-500">
            {review.name} · order {review.orderNumber} · {new Date(review.updatedAt).toLocaleString('en-PK')}
          </p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[review.status])}>{review.status}</span>
      </div>
      <div className="mt-2">
        <Stars rating={review.rating} />
      </div>
      {review.title && <p className="mt-1 font-semibold text-slate-900">{review.title}</p>}
      <p className="mt-1 text-sm text-slate-700">{review.body}</p>
      <div className="mt-3 flex items-center gap-2">
        {review.status !== 'approved' && (
          <Button size="sm" disabled={pending} onClick={() => act('approved')}>
            Publish
          </Button>
        )}
        {review.status !== 'hidden' && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act('hidden')}>
            Hide
          </Button>
        )}
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </div>
  );
}

export function ReviewModeration({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) return <p className="mt-8 text-center text-sm text-slate-500">No reviews here.</p>;
  return (
    <div className="mt-4 space-y-3">
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} />
      ))}
    </div>
  );
}
