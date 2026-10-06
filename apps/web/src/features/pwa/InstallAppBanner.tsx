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
    <div className="fixed bottom-5 left-4 z-40 flex items-center gap-2.5 rounded-full border border-stone-200/70 bg-white/95 py-1.5 pl-2.5 pr-1.5 shadow-lg shadow-stone-900/10 backdrop-blur">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-violet-600 text-white shadow-sm shadow-amber-600/30">
        {deferred ? <Download className="size-4" /> : <Share className="size-4" />}
      </span>
      <p className="text-sm font-semibold tracking-tight text-stone-900">
        {deferred ? 'Instalar Fonema' : 'Añadir a pantalla de inicio'}
      </p>
      {deferred && (
        <button
          onClick={() => void install()}
          className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-amber-600/25 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
        >
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        className="shrink-0 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        aria-label="Cerrar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
