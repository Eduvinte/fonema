import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AudioLines } from 'lucide-react';
import { useAuthStore } from './auth.store';
import { api } from '../../shared/api/client';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';

const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    }
  };

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión para seguir practicando tu pronunciación."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="tu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-amber-700 hover:text-amber-800">
          Regístrate gratis
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-stone-500">
        <Link
          to="/forgot-password"
          className="font-medium text-stone-400 hover:text-stone-700"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    name: z.string().max(80, 'Máximo 80 caracteres').optional(),
    email: z.string().email('Ingresa un email válido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
  });

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await registerUser(values.email, values.password, values.name);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Empieza gratis: 50 palabras con IA al mes y voces del navegador."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          id="name"
          label="Nombre (opcional)"
          placeholder="Tu nombre"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="tu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          type="password"
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-amber-700 hover:text-amber-800">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-600 text-amber-50 shadow-sm shadow-amber-600/30">
          <AudioLines className="size-5" />
        </span>
        <span className="font-display text-2xl italic tracking-tight text-stone-900">
          Talk Eli
        </span>
      </Link>
      <Card className="w-full max-w-md p-7">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">{subtitle}</p>
        {children}
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email('Ingresa un email válido'),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: values.email }),
        skipAuthRefresh: true,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    }
  };

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecerla."
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-stone-600">
            Si existe una cuenta con ese email, recibirás un enlace de
            recuperación en unos minutos.
          </p>
          <Link to="/login">
            <Button variant="secondary" className="w-full">
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="tu@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Enviar enlace
          </Button>
          <p className="text-center text-sm text-stone-500">
            <Link to="/login" className="font-medium text-amber-700 hover:text-amber-800">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const schema = z
    .object({
      password: z.string().min(8, 'Mínimo 8 caracteres'),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: 'Las contraseñas no coinciden',
      path: ['confirm'],
    });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: values.password }),
        skipAuthRefresh: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer');
    }
  };

  if (!token) {
    return (
      <AuthShell title="Enlace inválido" subtitle="Este enlace no es válido.">
        <Link to="/forgot-password">
          <Button className="w-full">Solicitar otro enlace</Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña nueva para tu cuenta."
    >
      {done ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-stone-600">
            Contraseña actualizada correctamente.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Iniciar sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="password"
            type="password"
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            id="confirm"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Restablecer contraseña
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
