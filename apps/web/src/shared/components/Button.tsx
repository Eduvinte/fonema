import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'premium';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-600/20 disabled:hover:bg-amber-600',
  premium:
    'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-600/20 disabled:hover:bg-violet-600',
  secondary:
    'bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 disabled:hover:bg-white',
  ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
