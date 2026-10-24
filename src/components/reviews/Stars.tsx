import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Read-only star rating; partial stars are rounded to the nearest half. */
export function Stars({ rating, className, size = 'h-4 w-4' }: { rating: number; className?: string; size?: string }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-block">
          <Star className={cn(size, 'text-slate-300')} />
          {rounded >= n - 0.5 && (
            <span className={cn('absolute inset-0 overflow-hidden', rounded >= n ? 'w-full' : 'w-1/2')}>
              <Star className={cn(size, 'fill-amber-400 text-amber-400')} />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
