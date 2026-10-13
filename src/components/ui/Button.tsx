import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800',
  accent: 'bg-blue-600 text-white hover:bg-blue-700',
  whatsapp: 'bg-emerald-600 text-white hover:bg-emerald-700',
  outline: 'border border-slate-300 bg-white text-slate-900 hover:border-slate-950',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
} as const;

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth = false) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
  );
}

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & StyleProps>(
  function Button({ variant, size, fullWidth, className, type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={cn(buttonStyles(variant, size, fullWidth), className)} {...props} />;
  },
);

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonStyles(variant, size, fullWidth), className)} {...props} />;
}

export function ExternalButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & StyleProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonStyles(variant, size, fullWidth), className)}
      {...props}
    />
  );
}
