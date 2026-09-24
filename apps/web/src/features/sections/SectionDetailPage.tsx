import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ListPlus,
  ListVideo,
  Pencil,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { sectionsApi, enrichSectionStream } from './sections.api';
import { usePlayAudio } from '../audio/usePlayAudio';
import { PlayButton } from '../audio/PlayButton';
import { useAuthStore } from '../auth/auth.store';
import type { Word } from '../../shared/api/types';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input, Textarea } from '../../shared/components/Input';
import { Modal } from '../../shared/components/Modal';
import { LoadingBlock } from '../../shared/components/Spinner';
import { cn } from '../../shared/lib/utils';

type EnrichState =
  | { phase: 'idle' }
  | { phase: 'running'; done: number; total: number }
  | { phase: 'error' | 'quota'; message: string }
  | { phase: 'done'; enriched: number };

export function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { playAll, playingAll, stop } = usePlayAudio();

  const { data: section, isLoading } = useQuery({
    queryKey: ['section', id],
    queryFn: () => sectionsApi.get(id!),
    enabled: Boolean(id),
  });

  const [enrich, setEnrich] = useState<EnrichState>({ phase: 'idle' });
  const [showAddWords, setShowAddWords] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const startedRef = useRef(false);

  const pendingWords = section?.words.filter((w) => !w.translation || !w.example) ?? [];
  const autoEnrich = searchParams.get('enrich') === '1';

  useEffect(() => {
    if (autoEnrich && !startedRef.current && pendingWords.length > 0) {
      startedRef.current = true;
      setSearchParams({}, { replace: true });
      void runEnrich();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnrich, section]);

  const runEnrich = useCallback(async () => {
    if (!id) return;
    setEnrich({ phase: 'running', done: 0, total: pendingWords.length });
    try {
      await enrichSectionStream(id, (event) => {
        if (event.event === 'progress') {
          setEnrich({ phase: 'running', done: event.done, total: event.total });
        } else if (event.event === 'done') {
          setEnrich({ phase: 'done', enriched: event.enriched });
          void queryClient.invalidateQueries({ queryKey: ['section', id] });
          void queryClient.invalidateQueries({ queryKey: ['sections'] });
          useAuthStore.getState().bootstrap().catch(() => undefined);
        } else if (event.event === 'quota') {
          setEnrich({ phase: 'quota', message: event.message });
        } else {
          setEnrich({ phase: 'error', message: event.message });
        }
      });
    } catch (err) {
      setEnrich({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Error inesperado',
      });
    }
  }, [id, pendingWords.length, queryClient]);

  const deleteSection = useMutation({
    mutationFn: () => sectionsApi.remove(id!),
    onSuccess: () => navigate('/app'),
  });

  if (isLoading || !section) return <LoadingBlock>Cargando sección…</LoadingBlock>;

  const handlePlayAll = () => {
    if (playingAll) {
      stop();
      return;
    }
    void playAll(
      section.words.map((w) => ({ text: w.text, mode: 'word' as const, wordId: w.id })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Volver"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {section.name}
            </h1>
            <p className="text-sm text-stone-500">
              {section.words.length}{' '}
              {section.words.length === 1 ? 'palabra' : 'palabras'} ·{' '}
              {pendingWords.length > 0
                ? `${pendingWords.length} sin generar`
                : 'todo generado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowRename(true)}>
            <Pencil className="size-4" /> Renombrar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" /> Eliminar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handlePlayAll} variant={playingAll ? 'secondary' : 'primary'} size="sm">
          <ListVideo className="size-4" />
          {playingAll ? 'Detener' : 'Reproducir todo'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowAddWords(true)}>
          <ListPlus className="size-4" /> Añadir palabras
        </Button>
        {pendingWords.length > 0 && (
          <Button
            variant="premium"
            size="sm"
            onClick={() => void runEnrich()}
            loading={enrich.phase === 'running'}
          >
            <Sparkles className="size-4" />
            Generar traducciones y frases
          </Button>
        )}
      </div>

      {enrich.phase === 'running' && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-stone-700">
              <Sparkles className="size-4 text-violet-600 animate-pulse" />
              Generando con IA…
            </span>
            <span className="text-stone-500">
              {enrich.done} / {enrich.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-violet-500 transition-all duration-300"
              style={{ width: `${enrich.total ? (enrich.done / enrich.total) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      {enrich.phase === 'done' && (
        <Card className="flex items-center gap-2 border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
          <Sparkles className="size-4" />
          Se generaron {enrich.enriched} palabras correctamente.
        </Card>
      )}

      {(enrich.phase === 'quota' || enrich.phase === 'error') && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50/60 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <TriangleAlert className="size-4 shrink-0" />
            <span>{enrich.message}</span>
          </div>
          {enrich.phase === 'quota' && (
            <Link to="/app/billing">
              <Button variant="premium" size="sm">
                Mejorar a Premium
              </Button>
            </Link>
          )}
        </Card>
      )}

      <div className="space-y-3">
        {section.words.map((word, index) => (
          <WordCard
            key={word.id}
            word={word}
            index={index}
            total={section.words.length}
            onEdit={() => setEditingWord(word)}
          />
        ))}
        {section.words.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-500">
            Esta sección aún no tiene palabras. Usa “Añadir palabras” para empezar.
          </p>
        )}
      </div>

      <AddWordsModal
        open={showAddWords}
        onClose={() => setShowAddWords(false)}
        sectionId={section.id}
      />

      <RenameModal
        open={showRename}
        onClose={() => setShowRename(false)}
        sectionId={section.id}
        currentName={section.name}
      />

      <EditWordModal word={editingWord} onClose={() => setEditingWord(null)} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar sección"
      >
        <p className="text-sm text-stone-600">
          ¿Seguro que quieres eliminar «{section.name}» y sus{' '}
          {section.words.length} palabras? Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={deleteSection.isPending}
            onClick={() => deleteSection.mutate()}
            className="border-red-300 bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="size-4" /> Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function WordCard({
  word,
  index,
  total,
  onEdit,
}: {
  word: Word;
  index: number;
  total: number;
  onEdit: () => void;
}) {
  return (
    <Card
      className={cn(
        'group flex flex-col gap-4 p-4 sm:flex-row sm:items-center',
        !word.translation && 'border-amber-200 bg-amber-50/40',
      )}
    >
      <div className="hidden w-8 shrink-0 text-sm font-medium text-stone-400 sm:block">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-stone-900">
            {word.text}
          </h3>
          <PlayButton text={word.text} mode="word" wordId={word.id} size="sm" />
          <span className="text-xs text-stone-400">
            {index + 1} / {total}
          </span>
        </div>

        {word.translation && (
          <p className="mt-1.5 text-sm text-amber-700/90">{word.translation}</p>
        )}

        {word.example && (
          <div className="mt-1.5 flex items-center gap-2">
            <PlayButton
              text={word.example}
              mode="example"
              wordId={word.id}
              size="sm"
              variant="ghost"
              label={`Escuchar frase de ejemplo con ${word.text}`}
            />
            <p className="text-sm text-stone-500">
              <span className="text-stone-400">“</span>
              {word.example}
              <span className="text-stone-400">”</span>
            </p>
          </div>
        )}
      </div>
      <button
        onClick={onEdit}
        className="self-start rounded-lg p-2 text-stone-300 opacity-0 transition-opacity hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100 max-sm:opacity-100 cursor-pointer"
        aria-label={`Editar ${word.text}`}
      >
        <Pencil className="size-4" />
      </button>
    </Card>
  );
}

function AddWordsModal({
  open,
  onClose,
  sectionId,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: string;
}) {
  const queryClient = useQueryClient();
  const [list, setList] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      sectionsApi.addWords(
        sectionId,
        list.split('\n').map((w) => w.trim()).filter(Boolean),
      ),
    onSuccess: (result) => {
      setList('');
      setError(null);
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['section', sectionId] });
      void queryClient.invalidateQueries({ queryKey: ['sections'] });
      if (result.added === 0) setError('Todas esas palabras ya están en la sección');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Añadir palabras">
      <div className="space-y-4">
        <Textarea
          rows={8}
          placeholder={'fork\nplate\nnapkin'}
          value={list}
          onChange={(e) => setList(e.target.value)}
          label="Una palabra por línea"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!list.trim()}
          >
            Añadir
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RenameModal({
  open,
  onClose,
  sectionId,
  currentName,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  currentName: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);

  useEffect(() => setName(currentName), [currentName, open]);

  const mutation = useMutation({
    mutationFn: () => sectionsApi.rename(sectionId, name),
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['section', sectionId] });
      void queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Renombrar sección">
      <div className="space-y-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!name.trim()}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditWordModal({ word, onClose }: { word: Word | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [example, setExample] = useState('');

  useEffect(() => {
    if (word) {
      setText(word.text);
      setTranslation(word.translation ?? '');
      setExample(word.example ?? '');
    }
  }, [word]);

  const updateMutation = useMutation({
    mutationFn: () =>
      sectionsApi.updateWord(word!.id, { text, translation, example }),
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['section', word?.sectionId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => sectionsApi.removeWord(word!.id),
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['section', word?.sectionId] });
      void queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  return (
    <Modal open={Boolean(word)} onClose={onClose} title="Editar palabra">
      <div className="space-y-4">
        <Input label="Palabra" value={text} onChange={(e) => setText(e.target.value)} />
        <Input
          label="Traducción"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
        />
        <Textarea
          label="Frase de ejemplo"
          rows={3}
          value={example}
          onChange={(e) => setExample(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
          >
            <Trash2 className="size-4" /> Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
