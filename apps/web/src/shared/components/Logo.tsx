import { AudioLines } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function Logo({
  to = '/',
  light,
  className,
}: {
  to?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 font-semibold', className)}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-amber-600 text-amber-50 shadow-sm shadow-amber-600/30">
        <AudioLines className="size-4.5" />
      </span>
      <span
        className={cn(
          'font-display text-xl italic tracking-tight',
          light ? 'text-white' : 'text-stone-900',
        )}
      >
        fonema
      </span>
    </Link>
  );
}
