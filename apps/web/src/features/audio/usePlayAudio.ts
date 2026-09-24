import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/auth.store';
import { api } from '../../shared/api/client';
import { hashString } from '../../shared/lib/utils';
import type { AudioMode } from '../../shared/api/types';
import { useEnglishVoices, pickVoice } from './voices';
import { getCachedClip, pruneCachedClips, setCachedClip } from './audioCache';

export interface PlayRequest {
  text: string;
  mode: AudioMode;
  wordId?: string;
}

const requestKey = (r: PlayRequest) => `${r.wordId ?? r.text}:${r.mode}`;

export function usePlayAudio() {
  const plan = useAuthStore((s) => s.user?.plan);
  const isPremium = plan === 'PREMIUM';
  const voices = useEnglishVoices();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPlayingKey(null);
    setLoadingKey(null);
    setPlayingAll(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const fetchPremiumBlob = useCallback(
    async (wordId: string, mode: AudioMode, text: string): Promise<Blob> => {
      const prefix = `${wordId}:${mode}:`;
      const cacheKey = `${prefix}${hashString(text)}`;
      const cached = await getCachedClip(cacheKey);
      if (cached) return cached;
      const blob = await api<Blob>(`/words/${wordId}/audio?mode=${mode}`, {
        responseType: 'blob',
      });
      void pruneCachedClips(prefix);
      void setCachedClip(cacheKey, blob);
      return blob;
    },
    [],
  );

  const playAndWait = useCallback(
    async (request: PlayRequest): Promise<void> => {
      const key = requestKey(request);

      if (isPremium && request.wordId) {
        setLoadingKey(key);
        try {
          const blob = await fetchPremiumBlob(
            request.wordId,
            request.mode,
            request.text,
          );
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          setPlayingKey(key);
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            void audio.play().catch(() => resolve());
          });
          URL.revokeObjectURL(url);
        } finally {
          setLoadingKey((k) => (k === key ? null : k));
        }
        return;
      }

      const synth = window.speechSynthesis;
      if (!synth) return;
      setPlayingKey(key);
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(request.text);
        const voice = pickVoice(voices, localStorage.getItem('fonema-voice'));
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.speak(utterance);
      });
    },
    [fetchPremiumBlob, isPremium, voices],
  );

  const play = useCallback(
    (request: PlayRequest) => {
      const key = requestKey(request);
      if (playingKey === key || playingAll) {
        stop();
        return;
      }
      stop();
      void playAndWait(request).finally(() =>
        setPlayingKey((k) => (k === key ? null : k)),
      );
    },
    [playAndWait, playingAll, playingKey, stop],
  );

  const playAll = useCallback(
    async (items: PlayRequest[]) => {
      stop();
      setPlayingAll(true);
      try {
        for (const item of items) {
          const key = requestKey(item);
          setPlayingKey(key);
          await playAndWait(item);
        }
      } finally {
        setPlayingKey(null);
        setPlayingAll(false);
      }
    },
    [playAndWait, stop],
  );

  return { play, playAll, stop, playingKey, loadingKey, playingAll, isPremium, voices };
}
