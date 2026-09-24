import { ReactNode } from 'react';
import { cn } from '../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600',
        className,
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function LoadingBlock({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500">
      <Spinner className="size-6" />
      {children && <p className="text-sm">{children}</p>}
    </div>
  );
}
