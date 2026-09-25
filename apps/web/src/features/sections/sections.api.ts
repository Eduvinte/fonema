import { api } from '../../shared/api/client';
import { parseSseStream } from '../../shared/api/sse';
import type { SectionDetail, SectionSummary, Word } from '../../shared/api/types';
import { useAuthStore } from '../auth/auth.store';

export const sectionsApi = {
  list: () => api<SectionSummary[]>('/sections'),
  get: (id: string) => api<SectionDetail>(`/sections/${id}`),
  create: (name: string, words?: string[]) =>
    api<SectionDetail>('/sections', {
      method: 'POST',
      body: JSON.stringify({ name, words }),
    }),
  rename: (id: string, name: string) =>
    api<SectionDetail>(`/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  remove: (id: string) => api<{ ok: boolean }>(`/sections/${id}`, { method: 'DELETE' }),
  addWords: (id: string, words: string[]) =>
    api<{ added: number; skipped: number }>(`/sections/${id}/words`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    }),
  updateWord: (wordId: string, data: Partial<Pick<Word, 'text' | 'translation' | 'example'>>) =>
    api<Word>(`/words/${wordId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeWord: (wordId: string) =>
    api<{ ok: boolean }>(`/words/${wordId}`, { method: 'DELETE' }),
};

export type EnrichEvent =
  | { event: 'progress'; words: Array<{ word: string; translation: string; example: string }>; done: number; total: number }
  | { event: 'done'; enriched: number }
  | { event: 'quota'; message: string }
  | { event: 'error'; message: string };

export async function enrichSectionStream(
  sectionId: string,
  onEvent: (event: EnrichEvent) => void,
): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  const base = (import.meta.env.VITE_API_URL ?? '') + '/api';

  const response = await fetch(`${base}/sections/${sectionId}/enrich`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      (data as { message?: string })?.message ?? `Error (${response.status})`,
    );
  }

  if (!response.body) return;

  for await (const { event, data } of parseSseStream(response)) {
    onEvent({ event, ...data } as EnrichEvent);
  }
}
