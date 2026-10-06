import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Crown,
  FileText,
  FolderPlus,
  ListPlus,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { chatApi, streamChatMessage } from './chat.api';
import type { ChatActionDto, ChatDocument, ChatMessageDto } from './chat.api';
import { useAuthStore } from '../auth/auth.store';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Textarea } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { LoadingBlock } from '../../shared/components/Spinner';
import { cn } from '../../shared/lib/utils';

const SUGGESTIONS = [
  'Crea una lista de 15 palabras sobre comida',
  'Palabras útiles para viajar en avión',
  'Añade palabras de negocios a una sección',
  '¿Cómo se pronuncia "thorough"?',
];

const MAX_DOCUMENT_CHARS = 60000;
const DEFAULT_DOCUMENT_INSTRUCTION =
  'Extrae el vocabulario más importante de este documento y propón una sección.';

export function ChatConversation({
  conversationId,
  variant = 'page',
}: {
  conversationId: string;
  variant?: 'page' | 'widget';
}) {
  const user = useAuthStore((s) => s.user);
  const isPremium = user?.plan === 'PREMIUM';
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat', conversationId, 'messages'],
    queryFn: () => chatApi.messages(conversationId),
    enabled: isPremium,
  });

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<{
    text: string;
    action: ChatActionDto | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDoc, setPendingDoc] = useState<ChatDocument | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history, streaming]);

  const clearMutation = useMutation({
    mutationFn: () => chatApi.deleteConversation(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      window.location.href = '/app/chat';
    },
  });

  const handleClear = () => {
    if (confirm('¿Eliminar esta conversación y todo su historial?')) {
      clearMutation.mutate();
    }
  };

  const send = async () => {
    if (streaming) return;
    const text = input.trim();
    if (!text && !pendingDoc) return;
    const doc = pendingDoc;
    setInput('');
    setPendingDoc(null);
    setError(null);
    setStreaming({ text: '', action: null });
    try {
      await streamChatMessage(
        conversationId,
        text || DEFAULT_DOCUMENT_INSTRUCTION,
        (event) => {
          if (event.event === 'delta') {
            setStreaming((prev) => ({
              text: (prev?.text ?? '') + event.text,
              action: prev?.action ?? null,
            }));
          } else if (event.event === 'action') {
            setStreaming((prev) => ({ text: prev?.text ?? '', action: event.action }));
          } else if (event.event === 'done') {
            void queryClient.invalidateQueries({
              queryKey: ['chat', conversationId, 'messages'],
            });
            void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
            void queryClient.invalidateQueries({ queryKey: ['sections'] });
          } else if (event.event === 'error') {
            setError(event.message);
          }
        },
        doc ?? undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setStreaming(null);
    }
  };

  if (!isPremium) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-6 text-center',
          variant === 'page' && 'pt-10',
        )}
      >
        <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Asistente IA — exclusivo Premium
          </h2>
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

  return (
    <div className={cn('flex flex-col', variant === 'page' ? 'h-full' : 'min-h-0 flex-1')}>
      {variant === 'page' && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Asistente IA
            </h1>
            <Badge tone="violet">
              <Sparkles className="size-3" /> Premium
            </Badge>
          </div>
          {history && history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              loading={clearMutation.isPending}
            >
              <Trash2 className="size-4" /> Eliminar conversación
            </Button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {isLoading && <LoadingBlock>Cargando conversación…</LoadingBlock>}

        {!isLoading && history && history.length === 0 && !streaming && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Sparkles className="size-6" />
            </div>
            <p className="text-center text-sm text-stone-500">
              Pídeme vocabulario y lo dejo listo para tu colección.
              <br />
              Prueba con una de estas ideas:
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history?.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {streaming && (
          <MessageBubble
            streaming
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streaming.text,
              action: streaming.action,
              status: streaming.action ? 'pending' : 'idle',
              executedSectionId: null,
              createdAt: new Date().toISOString(),
            }}
          />
        )}

        {error && (
          <Card className="border-red-200 bg-red-50/60 p-3 text-sm text-red-700">
            {error}
          </Card>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingDoc && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2">
          <FileText className="size-4 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-stone-800">
              {pendingDoc.name ?? 'Texto pegado'}
            </p>
            <p className="text-[10px] text-stone-400">
              {pendingDoc.content.length.toLocaleString('es-CL')} caracteres
            </p>
          </div>
          <button
            onClick={() => setPendingDoc(null)}
            className="rounded-md p-1 text-stone-400 hover:bg-violet-100 hover:text-stone-700 cursor-pointer"
            aria-label="Quitar documento"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-2 flex items-end gap-2 border-t border-stone-200/70 pt-3"
      >
        <button
          type="button"
          onClick={() => setAttachOpen(true)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 cursor-pointer"
          aria-label="Adjuntar documento"
          title="Adjuntar documento (.txt o .md)"
        >
          <Paperclip className="size-4.5" />
        </button>
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingDoc
                ? 'Instrucción (opcional)…'
                : 'Pide vocabulario o haz una pregunta…'
            }
            className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-4 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            maxLength={2000}
            disabled={Boolean(streaming)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          variant="premium"
          className="h-11 w-11 px-0"
          disabled={(!input.trim() && !pendingDoc) || Boolean(streaming)}
          aria-label="Enviar mensaje"
        >
          {streaming ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>

      <AttachDocumentModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onConfirm={(doc) => {
          setPendingDoc(doc);
          setAttachOpen(false);
        }}
      />
    </div>
  );
}

function AttachDocumentModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (doc: ChatDocument) => void;
}) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      if (content.length > MAX_DOCUMENT_CHARS) {
        setError(
          `El documento supera el límite de ${MAX_DOCUMENT_CHARS.toLocaleString('es-CL')} caracteres (tiene ${content.length.toLocaleString('es-CL')}).`,
        );
        return;
      }
      setName(file.name);
      setText(content);
    };
    reader.onerror = () => setError('No se pudo leer el archivo');
    reader.readAsText(file);
  };

  const confirm = () => {
    setError(null);
    const content = text.trim();
    if (!content) {
      setError('Pega un texto o selecciona un archivo');
      return;
    }
    if (content.length > MAX_DOCUMENT_CHARS) {
      setError(
        `El documento supera el límite de ${MAX_DOCUMENT_CHARS.toLocaleString('es-CL')} caracteres.`,
      );
      return;
    }
    onConfirm({ name: name.trim() || undefined, content });
    setName('');
    setText('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Adjuntar documento" wide>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del documento (opcional)"
          maxLength={200}
          className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Sube un archivo <span className="font-medium">.txt</span> o{' '}
            <span className="font-medium">.md</span>, o pega el texto abajo.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="size-4" /> Elegir archivo
          </Button>
        </div>

        <Textarea
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Eli: Hey, is this seat taken?\nEmma: No, go ahead.\n…'}
          hint={`${text.length.toLocaleString('es-CL')} / ${MAX_DOCUMENT_CHARS.toLocaleString('es-CL')} caracteres`}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!text.trim()}>
            <Paperclip className="size-4" /> Adjuntar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const PREVIEW_CHARS = 240;

function UserBubble({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > PREVIEW_CHARS;

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-amber-600 px-4 py-2.5 text-sm text-white shadow-sm shadow-amber-600/20">
        <p className="whitespace-pre-wrap break-words">
          {isLong && !expanded
            ? content.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, '') + '…'
            : content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs font-medium text-amber-100/90 underline underline-offset-2 hover:text-white cursor-pointer"
          >
            {expanded ? 'Ver menos' : 'Ver documento completo'}
          </button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessageDto;
  streaming?: boolean;
}) {
  if (message.role === 'user') {
    return <UserBubble content={message.content} />;
  }

  const isPending = message.action && message.status === 'pending';

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
        <Sparkles className="size-3.5" />
      </span>
      <div className="max-w-[85%] space-y-2">
        {(message.content || streaming) && (
          <Card
            className={cn(
              'rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-stone-700',
              streaming && 'border-violet-200',
            )}
          >
            {message.content ? (
              message.content
            ) : (
              <span className="inline-flex gap-1 text-stone-400">
                <span className="size-1.5 animate-bounce rounded-full bg-violet-400" />
                <span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" />
              </span>
            )}
          </Card>
        )}
        {message.action && isPending && !streaming && (
          <ActionCard message={message} />
        )}
        {message.action && message.status === 'executed' && (
          <ExecutedCard message={message} />
        )}
        {message.action && message.status === 'dismissed' && (
          <p className="text-xs text-stone-400">Propuesta descartada</p>
        )}
      </div>
    </div>
  );
}

function ActionCard({ message }: { message: ChatMessageDto }) {
  const queryClient = useQueryClient();
  const action = message.action!;

  const execute = useMutation({
    mutationFn: () => chatApi.execute(message.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  const dismiss = useMutation({
    mutationFn: () => chatApi.dismiss(message.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const title =
    action.type === 'create_section'
      ? `Crear sección “${action.name}”`
      : `Añadir palabras a ${action.sectionName ?? 'tu sección'}`;

  const hiddenCount = Math.max(0, action.wordCount - action.preview.length);

  return (
    <Card className="overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-violet-600 text-white shadow-sm shadow-amber-600/20">
          {action.type === 'create_section' ? (
            <FolderPlus className="size-4.5" />
          ) : (
            <ListPlus className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {action.wordCount} {action.wordCount === 1 ? 'palabra' : 'palabras'}{' '}
            con traducción y frase de ejemplo
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {action.preview.map((word) => (
              <span
                key={word}
                className="rounded-lg border border-violet-100 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 shadow-xs"
              >
                {word}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
                +{hiddenCount} más
              </span>
            )}
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={() => execute.mutate()}
              disabled={execute.isPending}
              className="group inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-md shadow-amber-600/30 transition-all duration-150 hover:shadow-lg hover:shadow-violet-600/30 hover:brightness-110 active:scale-[0.97] disabled:opacity-60 cursor-pointer"
            >
              {execute.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderPlus className="size-4 transition-transform duration-150 group-hover:-rotate-6 group-hover:scale-110" />
              )}
              {action.type === 'create_section'
                ? 'Crear sección'
                : 'Añadir palabras'}
            </button>
            <button
              onClick={() => dismiss.mutate()}
              disabled={execute.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50 cursor-pointer"
            >
              <X className="size-4" /> Descartar
            </button>
          </div>
          {execute.isError && (
            <p className="mt-2 text-xs text-red-600">
              {execute.error instanceof Error
                ? execute.error.message
                : 'Error al ejecutar'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ExecutedCard({ message }: { message: ChatMessageDto }) {
  const action = message.action!;
  const title =
    action.type === 'create_section'
      ? `Sección “${action.name}” creada`
      : `Palabras añadidas a ${action.sectionName ?? 'la sección'}`;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <Check className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-emerald-900">{title}</p>
          <p className="text-xs text-emerald-700/80">
            {action.wordCount} {action.wordCount === 1 ? 'palabra' : 'palabras'}
          </p>
        </div>
      </div>
      {message.executedSectionId && (
        <Link to={`/app/s/${message.executedSectionId}`}>
          <Button variant="secondary" size="sm">
            Ver sección <ArrowRight className="size-4" />
          </Button>
        </Link>
      )}
    </Card>
  );
}
