import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, ArrowRight } from 'lucide-react';
import { sectionsApi } from './sections.api';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingBlock } from '../../shared/components/Spinner';

export function SectionsPage() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionsApi.list,
  });

  if (isLoading) return <LoadingBlock>Cargando tus secciones…</LoadingBlock>;

  if (!sections || sections.length === 0) {
    return (
      <div>
        <EmptyState
          icon={<FolderOpen className="size-6" />}
          title="Crea tu primera sección"
          description="Agrupa palabras por tema — comida, viajes, trabajo — y practica su pronunciación con un clic."
          action={
            <Link to="/app/nueva">
              <Button>
                <Plus className="size-4" /> Nueva sección
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Tus secciones
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {sections.length} {sections.length === 1 ? 'sección' : 'secciones'} ·{' '}
            {sections.reduce((acc, s) => acc + s.wordCount, 0)} palabras en total
          </p>
        </div>
        <Link to="/app/nueva">
          <Button>
            <Plus className="size-4" /> Nueva sección
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.id} to={`/app/s/${section.id}`}>
            <Card className="group p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300/70">
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <FolderOpen className="size-5" />
                </div>
                <ArrowRight className="size-4 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-amber-600" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-stone-900">
                {section.name}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {section.wordCount} {section.wordCount === 1 ? 'palabra' : 'palabras'}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
