import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  labelClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel, labelClassName, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={inputId} className={cn('mb-1 block text-sm font-medium text-slate-700', hideLabel && 'sr-only', labelClassName)}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200',
          className,
        )}
        {...props}
      />
    </div>
  );
});
