import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, FolderOpen, LogOut, MessageSquareText, Shield, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '../features/auth/auth.store';
import { chatApi } from '../features/chat/chat.api';
import { ChatConversation } from '../features/chat/ChatConversation';
import { Logo } from '../shared/components/Logo';
import { Button } from '../shared/components/Button';
import { Badge } from '../shared/components/Badge';
import { cn } from '../shared/lib/utils';

export function AppLayout() {
  const { status, user, bootstrap, logout } = useAuthStore();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    setChatOpen(false);
  }, [location.pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600" />
      </div>
    );
  }

  if (status === 'guest') return <Navigate to="/login" replace />;

  const isPremium = user?.plan === 'PREMIUM';
  const onChatPage = location.pathname === '/app/chat';

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo to="/app" />
            <nav className="hidden items-center gap-1 sm:flex">
              <NavItem to="/app" end>
                <FolderOpen className="size-4" /> Secciones
              </NavItem>
              <NavItem to="/app/chat">
                <Sparkles className="size-4" /> Asistente
              </NavItem>
              <NavItem to="/app/billing">
                <Crown className="size-4" /> Plan
              </NavItem>
              {user?.role === 'ADMIN' && (
                <NavItem to="/app/admin">
                  <Shield className="size-4" /> Admin
                </NavItem>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!isPremium && (
              <Link to="/app/billing">
                <Button variant="premium" size="sm">
                  <Crown className="size-4" /> Mejorar
                </Button>
              </Link>
            )}
            {isPremium && (
              <Badge tone="violet" className="hidden sm:inline-flex">
                <Crown className="size-3" /> Premium
              </Badge>
            )}
            <div className="hidden text-right sm:block">
              <p className="max-w-32 truncate text-sm font-medium text-stone-800">
                {user?.name || user?.email}
              </p>
              <p className="text-xs text-stone-400">{user?.email}</p>
            </div>
            <button
              onClick={() => void logout()}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-stone-200/60 px-4 py-1.5 sm:hidden">
          <NavItem to="/app" end>
            <FolderOpen className="size-4" /> Secciones
          </NavItem>
          <NavItem to="/app/chat">
            <Sparkles className="size-4" /> Asistente
          </NavItem>
          <NavItem to="/app/billing">
            <Crown className="size-4" /> Plan
          </NavItem>
          {user?.role === 'ADMIN' && (
            <NavItem to="/app/admin">
              <Shield className="size-4" /> Admin
            </NavItem>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      {!onChatPage && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-600/40 cursor-pointer"
          aria-label="Abrir asistente IA"
          title="Asistente IA"
        >
          <Sparkles className="size-6" />
        </button>
      )}

      {chatOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
            onClick={() => setChatOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-stone-50 shadow-2xl sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border">
            <div className="flex items-center justify-between border-b border-stone-200/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    Asistente IA
                  </p>
                  <Link
                    to="/app/chat"
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
                  >
                    <MessageSquareText className="size-3" /> Ver todas las
                    conversaciones
                  </Link>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                aria-label="Cerrar asistente"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
              <ChatWidget />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ChatWidget() {
  const isPremium = useAuthStore((s) => s.user?.plan === 'PREMIUM');
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.conversations,
    enabled: isPremium,
  });

  const createMutation = useMutation({
    mutationFn: chatApi.createConversation,
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setActiveId(conversation.id);
    },
  });

  useEffect(() => {
    if (isPremium && conversations && conversations.length === 0) {
      createMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, conversations]);

  const list = conversations ?? [];
  const conversationId =
    list.find((c) => c.id === activeId)?.id ?? list[0]?.id ?? null;

  const handleSelect = (value: string) => {
    if (value === '__new__') {
      createMutation.mutate();
      return;
    }
    setActiveId(value);
  };

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 border-b border-stone-200/70 pb-2.5">
        <MessageSquareText className="size-4 shrink-0 text-stone-400" />
        <select
          value={conversationId}
          onChange={(e) => handleSelect(e.target.value)}
          className="h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          aria-label="Cambiar conversación"
        >
          {list.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
          <option value="__new__">＋ Nueva conversación</option>
        </select>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatConversation
          key={conversationId}
          conversationId={conversationId}
          variant="widget"
        />
      </div>
    </div>
  );
}

function NavItem({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-white text-stone-900 shadow-sm border border-stone-200/70'
            : 'text-stone-500 hover:bg-white/60 hover:text-stone-800',
        )
      }
    >
      {children}
    </NavLink>
  );
}
