import { useEffect, useRef, useState } from 'react';
import { Check, Crown, CreditCard, Loader2, Sparkles, TriangleAlert, Volume2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi } from './billing.api';
import { useAuthStore } from '../auth/auth.store';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { LoadingBlock } from '../../shared/components/Spinner';
import { cn } from '../../shared/lib/utils';

const FEATURES = [
  { icon: Volume2, text: 'Voces de OpenAI, calidad natural' },
  { icon: Sparkles, text: 'Traducciones y frases IA ilimitadas' },
  { icon: Crown, text: 'Audio cacheado, reproducción instantánea' },
];

export function BillingPage() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const queryClient = useQueryClient();
  const { data: state, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: billingApi.getState,
  });

  const refetchBilling = () => queryClient.invalidateQueries({ queryKey: ['billing'] });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'checkout' | 'subscribe' | 'cancel' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncStopRef = useRef(false);

  const refreshAll = async () => {
    await bootstrap();
    await refetchBilling();
  };

  useEffect(() => {
    void billingApi
      .sync()
      .then((result) => {
        if (result.activated) void refreshAll();
      })
      .catch(() => undefined);
    return () => {
      syncStopRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollSync = async () => {
    syncStopRef.current = false;
    setSyncing(true);
    try {
      for (let attempt = 0; attempt < 10 && !syncStopRef.current; attempt++) {
        const result = await billingApi.sync();
        if (result.plan === 'PREMIUM' || result.activated) {
          await refreshAll();
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch {
      // silencioso: el usuario puede reintentar desde el botón
    } finally {
      setSyncing(false);
    }
  };

  const runAction = async (
    action: 'checkout' | 'subscribe' | 'cancel',
    fn: () => Promise<void>,
  ) => {
    setActionError(null);
    setActionLoading(action);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setActionLoading(null);
    }
  };

  const startCheckout = () =>
    runAction('checkout', async () => {
      const { redirectUrl } = await billingApi.checkout();
      window.location.href = redirectUrl;
    });

  const handleSubscribe = () =>
    runAction('subscribe', async () => {
      await billingApi.subscribe();
      await bootstrap();
      await refetchBilling();
      void pollSync();
    });

  const handleCancel = () => {
    if (!confirm('¿Cancelar tu suscripción Premium? Perderás el acceso a las voces de OpenAI.')) return;
    void runAction('cancel', async () => {
      await billingApi.cancel();
      await bootstrap();
      await refetchBilling();
    });
  };

  if (isLoading || !state) return <LoadingBlock>Cargando tu plan…</LoadingBlock>;

  const isPremium = state.plan === 'PREMIUM';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Tu plan</h1>
        <p className="mt-1 text-sm text-stone-500">
          Gestiona tu suscripción y los métodos de pago con Flow.
        </p>
      </div>

      <Card className={cn('p-6', isPremium && 'border-violet-200 bg-gradient-to-br from-violet-50/70 to-white')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-stone-900">
                {isPremium ? 'Plan Premium' : 'Plan Gratis'}
              </h2>
              {isPremium ? <Badge tone="violet">Activo</Badge> : <Badge tone="neutral">Actual</Badge>}
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {isPremium
                ? 'Voces OpenAI + generación IA ilimitada'
                : 'Voces del navegador + 50 palabras IA al mes'}
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-stone-900">
            {isPremium ? (
              <span className="text-violet-700">$4.990</span>
            ) : (
              <span>$0</span>
            )}
            <span className="ml-1 text-sm font-normal text-stone-500">
              {isPremium ? 'CLP / mes' : 'para siempre'}
            </span>
          </p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <li
              key={i}
              className={cn(
                'flex items-center gap-2.5 text-sm',
                isPremium ? 'text-stone-700' : i > 0 && 'text-stone-400 line-through decoration-stone-300',
              )}
            >
              <Icon className={cn('size-4', isPremium ? 'text-violet-600' : 'text-stone-300')} />
              {text}
              {isPremium && <Check className="ml-auto size-4 text-emerald-500" />}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-5">
          {!isPremium && (
            <Button variant="premium" size="lg" loading={actionLoading === 'checkout'} onClick={() => void startCheckout()}>
              <Crown className="size-4" /> Mejorar a Premium
            </Button>
          )}

          {isPremium && state.hasCard && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <CreditCard className="size-4" />
              {state.card?.creditCardType ?? 'Tarjeta'} ••••{' '}
              {state.card?.last4CardDigits ?? '****'}
            </div>
          )}

          {isPremium && (
            <Button variant="danger" loading={actionLoading === 'cancel'} onClick={() => void handleCancel()}>
              <X className="size-4" /> Cancelar suscripción
            </Button>
          )}
        </div>
      </Card>

      {actionError && (
        <Card className="flex items-start gap-3 border-red-200 bg-red-50/60 p-4">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{actionError}</p>
        </Card>
      )}

      {syncing && (
        <Card className="flex items-center gap-3 border-violet-200 bg-violet-50/60 p-4">
          <Loader2 className="size-4 animate-spin text-violet-600" />
          <p className="text-sm text-violet-800">
            Verificando tu pago con Flow…
          </p>
        </Card>
      )}

      {!isPremium && state.hasCard && (
        <Card className="border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-emerald-800">
              <p className="font-medium">Tu tarjeta ya está registrada en Flow</p>
              <p className="text-emerald-700/80">
                {state.subscriptionId
                  ? 'Suscripción activa. Si ya pagaste, pulsa "Verificar pago".'
                  : 'Solo falta activar la suscripción para empezar a usar Premium.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" loading={syncing} onClick={() => void pollSync()}>
                Verificar pago
              </Button>
              <Button variant="premium" loading={actionLoading === 'subscribe'} onClick={() => void handleSubscribe()}>
                <Crown className="size-4" /> Activar Premium
              </Button>
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-stone-400">
        Los pagos se procesan de forma segura a través de{' '}
        <span className="font-medium text-stone-500">Flow.cl</span>. Puedes cancelar en
        cualquier momento desde esta página.
      </p>
    </div>
  );
}
