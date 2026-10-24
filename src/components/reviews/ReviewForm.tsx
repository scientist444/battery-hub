'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { submitReview } from '@/app/(store)/reviews/actions';
import { cn } from '@/lib/cn';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ReviewForm({ productId, signInHref }: { productId: string; signInHref?: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string; signIn?: boolean }>();
  const [pending, start] = useTransition();

  if (result?.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {result.message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-950 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-slate-950 hover:text-white"
      >
        Write a review
      </button>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setResult({ ok: false, message: 'Choose a star rating.' });
    start(async () => setResult(await submitReview({ productId, rating, title, body })));
  };
  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Your rating</p>
        <div className="mt-1 flex items-center gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-0.5"
            >
              <Star className={cn('h-7 w-7', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
            </button>
          ))}
          <span className="text-sm text-slate-600">{LABELS[shown]}</span>
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Title (optional)"
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        maxLength={1000}
        rows={4}
        placeholder="How did it work for you? Fit, battery life, build quality…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
      />
      {result && !result.ok && (
        <p className="text-sm text-red-700">
          {result.message}{' '}
          {result.signIn && signInHref && (
            <a href={signInHref} className="font-semibold text-blue-700">
              Sign in with Google
            </a>
          )}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Submit review
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-slate-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
