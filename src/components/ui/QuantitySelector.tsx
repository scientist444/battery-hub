'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function QuantitySelector({ value, onChange, min = 1, max, size = 'md', className }: QuantitySelectorProps) {
  const atMax = max !== undefined && value >= max;
  const button = cn(
    'flex items-center justify-center text-slate-600 transition hover:text-slate-950 disabled:opacity-30',
    size === 'sm' ? 'h-8 w-8' : 'h-11 w-11',
  );

  return (
    <div className={cn('inline-flex items-center rounded-md border border-slate-300 bg-white', className)}>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn('min-w-8 text-center font-semibold text-slate-950', size === 'sm' ? 'text-sm' : 'text-base')}>
        {value}
      </span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={atMax} aria-label="Increase quantity">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
