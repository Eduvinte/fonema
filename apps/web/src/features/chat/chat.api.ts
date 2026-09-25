import { api } from '../../shared/api/client';
import { parseSseStream } from '../../shared/api/sse';
import { useAuthStore } from '../auth/auth.store';

export interface ChatActionDto {
  type: 'create_section' | 'add_words';
  name?: string;
  sectionName?: string;
  wordCount: number;
  preview: string[];
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action: ChatActionDto | null;
  status: 'idle' | 'pending' | 'executed' | 'dismissed';
  executedSectionId: string | null;
  createdAt: string;
}

export interface ChatConversationDto {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string | null;
  updatedAt: string;
  createdAt: string;
}

export type ChatStreamEvent =
  | { event: 'delta'; text: string }
  | { event: 'action'; action: ChatActionDto }
  | { event: 'done'; messageId: string; content: string; action: ChatActionDto | null }
  | { event: 'error'; status: number; message: string };

export const chatApi = {
  conversations: () => api<ChatConversationDto[]>('/chat/conversations'),
  createConversation: () =>
    api<ChatConversationDto>('/chat/conversations', { method: 'POST', body: JSON.stringify({}) }),
  deleteConversation: (conversationId: string) =>
    api<{ ok: boolean }>(`/chat/conversations/${conversationId}`, { method: 'DELETE' }),
  messages: (conversationId: string) =>
    api<ChatMessageDto[]>(`/chat/conversations/${conversationId}/messages`),
  execute: (messageId: string) =>
    api<{ sectionId: string; name: string; wordCount: number }>(
      `/chat/messages/${messageId}/execute`,
      { method: 'POST' },
    ),
  dismiss: (messageId: string) =>
    api<{ ok: boolean }>(`/chat/messages/${messageId}/dismiss`, { method: 'POST' }),
};

export async function streamChatMessage(
  conversationId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  const base = (import.meta.env.VITE_API_URL ?? '') + '/api';

  const response = await fetch(`${base}/chat/conversations/${conversationId}/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      (data as { message?: string })?.message ?? `Error (${response.status})`,
    );
  }

  for await (const { event, data } of parseSseStream(response)) {
    onEvent({ event, ...data } as ChatStreamEvent);
  }
}
