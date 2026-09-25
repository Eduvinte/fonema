import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { Crown, FolderOpen, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '../features/auth/auth.store';
import { Logo } from '../shared/components/Logo';
import { Button } from '../shared/components/Button';
import { Badge } from '../shared/components/Badge';
import { cn } from '../shared/lib/utils';

export function AppLayout() {
  const { status, user, bootstrap, logout } = useAuthStore();

  useEffect(() => {
    if (status === 'loading') void bootstrap();
  }, [status, bootstrap]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600" />
      </div>
    );
  }

  if (status === 'guest') return <Navigate to="/login" replace />;

  const isPremium = user?.plan === 'PREMIUM';

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
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
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
