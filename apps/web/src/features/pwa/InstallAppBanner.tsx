import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'fonema-pwa-dismissed';

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (hidden || isStandalone) return null;
  if (!deferred && !isIOS) return null;

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferred(null);
      dismiss();
    }
  };

  return (
    <div className="fixed bottom-5 left-4 z-40 flex max-w-[calc(100vw-8rem)] items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 shadow-lg shadow-stone-900/10 backdrop-blur">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-violet-600 text-white">
        {deferred ? <Download className="size-4.5" /> : <Share className="size-4.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-900">Instala Fonema</p>
        <p className="text-xs text-stone-500">
          {deferred
            ? 'Úsala como una app, con acceso directo.'
            : 'En iPhone: Compartir → Añadir a pantalla de inicio.'}
        </p>
      </div>
      {deferred && (
        <button
          onClick={() => void install()}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
        >
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        aria-label="Cerrar"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
