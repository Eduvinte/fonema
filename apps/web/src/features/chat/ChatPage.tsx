import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Crown,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { chatApi } from './chat.api';
import type { ChatConversationDto } from './chat.api';
import { ChatConversation } from './ChatConversation';
import { useAuthStore } from '../auth/auth.store';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { LoadingBlock } from '../../shared/components/Spinner';
import { cn } from '../../shared/lib/utils';

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const isPremium = user?.plan === 'PREMIUM';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('c');

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.conversations,
    enabled: isPremium,
  });

  useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSearchParams({ c: conversations[0].id }, { replace: true });
    }
  }, [conversations, selectedId, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: chatApi.createConversation,
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSearchParams({ c: conversation.id });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: (_data, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      if (selectedId === deletedId) {
        setSearchParams({}, { replace: true });
      }
    },
  });

  if (!isPremium) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 pt-10 text-center">
        <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Asistente IA — exclusivo Premium
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-stone-500">
            Conversa con la IA para crear secciones y listas de vocabulario,
            añadir palabras y resolver dudas de pronunciación, sin salir de la
            app.
          </p>
        </div>
        <Link to="/app/billing">
          <Button variant="premium" size="lg">
            <Crown className="size-4" /> Mejorar a Premium
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) return <LoadingBlock>Cargando conversaciones…</LoadingBlock>;

  const list = conversations ?? [];

  return (
    <div className="flex h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-stone-200 bg-stone-100/70 p-3 md:flex md:w-64',
          selectedId ? 'hidden' : 'flex',
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-stone-900">
            Conversaciones
          </h1>
          <Button
            size="sm"
            variant="premium"
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
          >
            <Plus className="size-4" /> Nueva
          </Button>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {list.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-6 text-center">
              <span className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                <MessageSquareText className="size-5" />
              </span>
              <p className="text-sm text-stone-500">
                Aún no tienes conversaciones. Crea una y pide tu primera lista
                de vocabulario.
              </p>
              <Button
                size="sm"
                variant="premium"
                onClick={() => createMutation.mutate()}
              >
                <Plus className="size-4" /> Nueva conversación
              </Button>
            </Card>
          )}
          {list.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === selectedId}
              onSelect={() => setSearchParams({ c: conversation.id })}
              onDelete={() => deleteMutation.mutate(conversation.id)}
            />
          ))}
        </div>
      </aside>

      <div
        className={cn(
          'min-w-0 flex-1 flex-col bg-white',
          selectedId ? 'flex' : 'hidden md:flex',
        )}
      >
        {selectedId ? (
          <>
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              className="mb-2 inline-flex items-center gap-1.5 self-start px-1 pt-3 text-sm text-stone-500 hover:text-stone-800 md:hidden cursor-pointer"
            >
              <ArrowLeft className="size-4" /> Conversaciones
            </button>
            <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">
              <ChatConversation conversationId={selectedId} variant="page" />
            </div>
          </>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center md:flex">
            <span className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <MessageSquareText className="size-6" />
            </span>
            <p className="text-sm text-stone-500">
              Selecciona una conversación o crea una nueva
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
}: {
  conversation: ChatConversationDto;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
        active
          ? 'border-violet-200 bg-violet-50/80'
          : 'border-transparent bg-white hover:bg-stone-100',
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-violet-100 text-violet-700' : 'bg-stone-100 text-stone-500',
        )}
      >
        <MessageSquareText className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            active ? 'text-violet-900' : 'text-stone-800',
          )}
        >
          {conversation.title}
        </p>
        <p className="truncate text-xs text-stone-400">
          {conversation.lastMessage ??
            (conversation.messageCount === 0 ? 'Sin mensajes' : '…')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-stone-400">
          {formatRelative(conversation.updatedAt)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`¿Eliminar «${conversation.title}»?`)) onDelete();
          }}
          className="rounded-md p-1 text-stone-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
          aria-label="Eliminar conversación"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
