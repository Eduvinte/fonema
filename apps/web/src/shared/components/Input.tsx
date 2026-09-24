import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(({ className, label, error, hint, id, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={cn(
        'w-full h-10 rounded-xl border bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/60',
        error ? 'border-red-300' : 'border-stone-300 focus:border-amber-500',
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {!error && hint && <p className="text-xs text-stone-500">{hint}</p>}
  </div>
));

Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ className, label, error, hint, id, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
    )}
    <textarea
      ref={ref}
      id={id}
      className={cn(
        'w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none',
        error ? 'border-red-300' : 'border-stone-300 focus:border-amber-500',
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {!error && hint && <p className="text-xs text-stone-500">{hint}</p>}
  </div>
));

Textarea.displayName = 'Textarea';
