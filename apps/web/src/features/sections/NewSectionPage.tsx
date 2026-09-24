import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sectionsApi } from './sections.api';
import { useAuthStore } from '../auth/auth.store';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input, Textarea } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';

export function NewSectionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [list, setList] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wordCount = useMemo(
    () => list.split('\n').map((w) => w.trim()).filter(Boolean).length,
    [list],
  );

  const createMutation = useMutation({
    mutationFn: () => sectionsApi.create(name, list.split('\n').map((w) => w.trim()).filter(Boolean)),
    onSuccess: (section) => {
      const hasWords = section.words.length > 0;
      navigate(`/app/s/${section.id}${hasWords ? '?enrich=1' : ''}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Error al crear'),
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Ponle un nombre a la sección');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Nueva sección
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Pega tu lista de palabras y la IA generará la traducción y una frase de
          ejemplo para cada una.
        </p>
      </div>

      <Card className="space-y-5 p-6">
        <Input
          id="section-name"
          label="Nombre de la sección"
          placeholder="Comida, Viajes, Trabajo…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />

        <Textarea
          id="word-list"
          label="Lista de palabras"
          placeholder={'apple\nbread\nbutter\nspoon'}
          rows={10}
          value={list}
          onChange={(e) => setList(e.target.value)}
          hint="Una palabra por línea. Los duplicados se descartan."
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {wordCount > 0 ? (
              <Badge tone="amber">{wordCount} palabras</Badge>
            ) : (
              <Badge tone="neutral">Sin palabras todavía</Badge>
            )}
            {user?.plan === 'PREMIUM' && (
              <Badge tone="violet">
                <Sparkles className="size-3" /> IA ilimitada
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Link to="/app">
              <Button variant="ghost">Cancelar</Button>
            </Link>
            <Button onClick={submit} loading={createMutation.isPending}>
              Crear sección
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
