import { Loader2, Square, Volume2 } from 'lucide-react';
import { usePlayAudio } from './usePlayAudio';
import type { AudioMode } from '../../shared/api/types';
import { cn } from '../../shared/lib/utils';

export function PlayButton({
  text,
  mode = 'word',
  wordId,
  size = 'md',
  variant = 'primary',
  className,
  label,
}: {
  text: string;
  mode?: AudioMode;
  wordId?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost';
  className?: string;
  label?: string;
}) {
  const { play, playingKey, loadingKey } = usePlayAudio();
  const key = `${wordId ?? text}:${mode}`;
  const isPlaying = playingKey === key;
  const isLoading = loadingKey === key;

  const sizeClasses = {
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
  } as const;

  const iconSizes = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const;

  return (
    <button
      type="button"
      aria-label={label ?? `Escuchar ${text}`}
      title={label ?? `Escuchar ${text}`}
      onClick={() => play({ text, mode, wordId })}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
        sizeClasses[size],
        variant === 'primary'
          ? isPlaying
            ? 'bg-stone-900 text-white shadow-md'
            : 'bg-amber-600 text-white shadow-md shadow-amber-600/25 hover:bg-amber-700 active:scale-95'
          : isPlaying
            ? 'bg-stone-100 text-stone-900'
            : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-700 active:scale-95',
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      ) : isPlaying ? (
        <Square className={iconSizes[size]} />
      ) : (
        <Volume2 className={iconSizes[size]} />
      )}
    </button>
  );
}
