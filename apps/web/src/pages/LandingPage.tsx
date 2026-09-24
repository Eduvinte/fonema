import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Crown,
  FolderOpen,
  Sparkles,
  Volume2,
  WandSparkles,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/auth.store';
import { Logo } from '../shared/components/Logo';
import { Button } from '../shared/components/Button';
import { PlayButton } from '../features/audio/PlayButton';

const FREE_FEATURES = [
  'Secciones de vocabulario ilimitadas',
  'Pronunciación con voces del navegador',
  '50 palabras con IA al mes',
  'Frase de ejemplo por palabra',
];

const PREMIUM_FEATURES = [
  'Voces de OpenAI, calidad natural',
  'Traducciones y frases IA ilimitadas',
  'Reproducción instantánea con caché',
  'Cancela cuando quieras',
];

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const href = user ? '/app' : '/register';

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <a
            href="#precios"
            className="hidden rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800 sm:block"
          >
            Precios
          </a>
          {user ? (
            <Link to="/app">
              <Button size="sm">Ir a la app</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Empezar gratis</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <Sparkles className="size-3.5" /> Vocabulario generado con IA
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold italic leading-tight tracking-tight text-stone-900 sm:text-6xl">
            Pronuncia inglés
            <br />
            con confianza
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-stone-500">
            Pega tu lista de palabras, deja que la IA genere la traducción y una
            frase de ejemplo, y escucha cada palabra con un clic.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={href}>
              <Button size="lg">
                Empezar gratis <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#precios">
              <Button variant="secondary" size="lg">
                Ver planes
              </Button>
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { text: 'spoon', translation: 'cuchara', example: 'Use a spoon to stir the soup.' },
            { text: 'apple', translation: 'manzana', example: 'I eat an apple every morning.' },
            { text: 'butter', translation: 'mantequilla', example: 'Could you pass me the butter?' },
          ].map((word, i) => (
            <div
              key={word.text}
              className={`rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm ${
                i === 1 ? 'sm:-translate-y-3 sm:shadow-md' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-stone-900">{word.text}</h3>
                <PlayButton text={word.text} mode="word" size="sm" />
              </div>
              <p className="mt-1 text-sm text-amber-700/90">{word.translation}</p>
              <p className="mt-2 text-sm text-stone-500">“{word.example}”</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
          {[
            {
              icon: FolderOpen,
              title: 'Secciones por tema',
              text: 'Crea secciones como Comida o Viajes y organiza tu vocabulario a tu manera.',
            },
            {
              icon: WandSparkles,
              title: 'IA que trabaja por ti',
              text: 'Pegas las palabras, la IA genera la traducción al español y una frase de ejemplo natural.',
            },
            {
              icon: Volume2,
              title: 'Escucha y repite',
              text: 'Un botón para la palabra y otro para la frase. Repite hasta que suene perfecto.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl p-2">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-4xl px-4 py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold italic tracking-tight text-stone-900">
            Planes simples, en pesos chilenos
          </h2>
          <p className="mt-3 text-stone-500">
            Empieza gratis. Mejora cuando quieras escuchar con voces Premium.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
            <h3 className="text-base font-semibold text-stone-900">Gratis</h3>
            <p className="mt-3">
              <span className="text-4xl font-bold tracking-tight text-stone-900">$0</span>
              <span className="ml-1 text-sm text-stone-500">para siempre</span>
            </p>
            <ul className="mt-6 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
            <Link to={href} className="mt-7 block">
              <Button variant="secondary" className="w-full" size="lg">
                Empezar gratis
              </Button>
            </Link>
          </div>

          <div className="relative rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/70 to-white p-7 shadow-md">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
              Recomendado
            </span>
            <h3 className="flex items-center gap-2 text-base font-semibold text-stone-900">
              <Crown className="size-4 text-violet-600" /> Premium
            </h3>
            <p className="mt-3">
              <span className="text-4xl font-bold tracking-tight text-stone-900">$4.990</span>
              <span className="ml-1 text-sm text-stone-500">CLP / mes</span>
            </p>
            <ul className="mt-6 space-y-2.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-violet-500" /> {f}
                </li>
              ))}
            </ul>
            <Link to={href} className="mt-7 block">
              <Button variant="premium" className="w-full" size="lg">
                <Crown className="size-4" /> Probar Premium
              </Button>
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400">
          Pagos procesados de forma segura con Flow.cl. Cancela en cualquier momento.
        </p>
      </section>

      <footer className="border-t border-stone-200/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <Logo />
          <p className="text-sm text-stone-400">
            Hecho con ♥ para aprender idiomas. © {new Date().getFullYear()} Fonema.
          </p>
        </div>
      </footer>
    </div>
  );
}
