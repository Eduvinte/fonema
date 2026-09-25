import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AudioLines,
  Coins,
  FolderOpen,
  MessageSquareText,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  WandSparkles,
} from 'lucide-react';
import { adminApi } from './admin.api';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { LoadingBlock } from '../../shared/components/Spinner';
import { cn } from '../../shared/lib/utils';

const fmtNumber = (n: number) => n.toLocaleString('es-CL');
const fmtClp = (n: number) => `$${n.toLocaleString('es-CL')}`;

function relative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function AdminPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });
  const { data: activity } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: adminApi.activity,
  });

  if (isLoading || !stats) return <LoadingBlock>Cargando analíticas…</LoadingBlock>;

  const maxEvents = Math.max(1, ...stats.daily.map((d) => d.events));
  const maxUsers = Math.max(1, ...stats.daily.map((d) => d.newUsers));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-stone-500" />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Panel de administración
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="size-4" />}
          label="Usuarios"
          value={fmtNumber(stats.totals.users)}
          sub={`${stats.totals.usersToday} nuevos hoy`}
        />
        <MetricCard
          icon={<Activity className="size-4" />}
          label="Activos hoy"
          value={fmtNumber(stats.totals.activeToday)}
          sub={`${fmtNumber(stats.totals.active30d)} activos (30d)`}
        />
        <MetricCard
          icon={<FolderOpen className="size-4" />}
          label="Secciones"
          value={fmtNumber(stats.totals.sections)}
          sub={`${fmtNumber(stats.totals.words)} palabras`}
        />
        <MetricCard
          icon={<WandSparkles className="size-4" />}
          label="Palabras IA"
          value={fmtNumber(stats.totals.wordsGenerated)}
          sub="últimos 30 días"
        />
        <MetricCard
          icon={<AudioLines className="size-4" />}
          label="Audios"
          value={fmtNumber(stats.totals.audioPlays)}
          sub="últimos 30 días"
        />
        <MetricCard
          icon={<MessageSquareText className="size-4" />}
          label="Mensajes al chat"
          value={fmtNumber(stats.totals.chatMessages)}
          sub="total histórico"
        />
        <MetricCard
          icon={<Coins className="size-4" />}
          label="Pagos"
          value={fmtNumber(stats.totals.payments)}
          sub={`${fmtClp(stats.totals.revenue)} CLP`}
        />
        <MetricCard
          icon={<UserPlus className="size-4" />}
          label="Registros (30d)"
          value={fmtNumber(
            stats.daily.reduce((acc, d) => acc + d.newUsers, 0),
          )}
          sub="nuevos usuarios"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <TrendingUp className="size-4 text-amber-600" /> Eventos por día
            (30 días)
          </h2>
          <div className="flex h-40 items-end gap-[3px]">
            {stats.daily.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1 rounded-t-sm bg-amber-500/80 transition-colors hover:bg-amber-600"
                style={{ height: `${Math.max(4, (d.events / maxEvents) * 100)}%` }}
                title={`${d.date}: ${d.events} eventos`}
              />
            ))}
          </div>
          <div className="mt-4 flex h-16 items-end gap-[3px]">
            {stats.daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 rounded-t-sm bg-violet-500/70 transition-colors hover:bg-violet-600"
                style={{ height: `${Math.max(4, (d.newUsers / maxUsers) * 100)}%` }}
                title={`${d.date}: ${d.newUsers} registros`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-stone-400">
            <span>{stats.daily[0]?.date.slice(5)}</span>
            <span className="text-violet-600">■ nuevos usuarios</span>
            <span className="text-amber-600">■ eventos</span>
            <span>{stats.daily[stats.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Sparkles className="size-4 text-violet-600" /> Eventos principales
          </h2>
          <div className="space-y-2.5">
            {stats.topEvents.slice(0, 8).map((event) => (
              <div key={event.type} className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-stone-700">
                    {event.label}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-violet-500"
                      style={{
                        width: `${(event.count / (stats.topEvents[0]?.count ?? 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-semibold text-stone-600">
                  {fmtNumber(event.count)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <UsersTable />
        <ActivityFeed activity={activity ?? []} />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-stone-400">
        <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
        {value}
      </p>
      <p className="text-xs text-stone-400">{sub}</p>
    </Card>
  );
}

function UsersTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', debounced, page],
    queryFn: () => adminApi.users(debounced, page),
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setDebounced(search.trim());
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">
          Usuarios {data ? `(${fmtNumber(data.total)})` : ''}
        </h2>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar email o nombre…"
            className="h-9 w-44 rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 sm:w-56"
          />
        </form>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-400">
                <th className="pb-2 pr-3 font-medium">Usuario</th>
                <th className="pb-2 pr-3 font-medium">Plan</th>
                <th className="pb-2 pr-3 font-medium">Secciones</th>
                <th className="pb-2 pr-3 font-medium">Palabras</th>
                <th className="pb-2 font-medium">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-stone-800">
                          {user.email}
                          {user.role === 'ADMIN' && (
                            <Shield className="size-3.5 shrink-0 text-violet-600" />
                          )}
                        </p>
                        <p className="truncate text-xs text-stone-400">
                          {user.name ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={user.plan === 'PREMIUM' ? 'violet' : 'neutral'}>
                      {user.plan === 'PREMIUM' ? 'Premium' : 'Gratis'}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-stone-600">
                    {fmtNumber(user.sectionCount)}
                  </td>
                  <td className="py-2.5 pr-3 text-stone-600">
                    {fmtNumber(user.wordCount)}
                  </td>
                  <td className="py-2.5 text-stone-500">
                    {user.lastEventAt ? relative(user.lastEventAt) : 'nunca'}
                  </td>
                </tr>
              ))}
              {data && data.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded-md px-2 py-1 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
        >
          ← Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-md px-2 py-1 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
        >
          Siguiente →
        </button>
      </div>
    </Card>
  );
}

function ActivityFeed({ activity }: { activity: NonNullable<Awaited<ReturnType<typeof adminApi.activity>>> }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-stone-900">
        Actividad reciente
      </h2>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {activity.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-1 size-2 shrink-0 rounded-full',
                item.type === 'PAYMENT_RECEIVED'
                  ? 'bg-emerald-500'
                  : item.type === 'REGISTER'
                    ? 'bg-violet-500'
                    : 'bg-amber-500',
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-stone-700">
                {item.label}
                {item.user && (
                  <span className="font-normal text-stone-400">
                    {' '}
                    · {item.user.email}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-stone-400">
                {relative(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {activity.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-400">
            Aún no hay actividad registrada
          </p>
        )}
      </div>
    </Card>
  );
}
