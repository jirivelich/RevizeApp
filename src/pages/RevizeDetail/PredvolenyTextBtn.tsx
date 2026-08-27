import { useState, useRef, useEffect } from 'react';
import type { PredvolenyText } from '../../types';
import { useCreatePredvolenyText, useDeletePredvolenyText, usePredvoleneTexty } from '../../hooks/useQueries';
import { PREDVOLENE_TEXTY } from './constants';
import { ConfirmDialog } from '../../components/ui';

interface PredvolenyTextBtnProps {
  field: string;
  mode?: 'replace' | 'append';
  value: string;
  onChange: (value: string) => void;
  vlastniTexty?: PredvolenyText[];        // optional – pokud není, bere z React Query
  setVlastniTexty?: React.Dispatch<React.SetStateAction<PredvolenyText[]>>; // deprecated, ignorován
}

export function PredvolenyTextBtn({ field, mode = 'replace', value, onChange, vlastniTexty: vlastniTextyProp }: PredvolenyTextBtnProps) {
  const { data: vlastniTextyQuery = [] } = usePredvoleneTexty();
  const vlastniTexty = vlastniTextyProp ?? vlastniTextyQuery;
  const createText = useCreatePredvolenyText();
  const deleteText = useDeletePredvolenyText();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newNazev, setNewNazev] = useState('');
  const [newText, setNewText] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const builtIn = PREDVOLENE_TEXTY[field] || [];
  const custom = vlastniTexty.filter(t => t.pole === field);

  // Zavřít při kliknutí mimo
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAdd = async () => {
    if (!newNazev.trim() || !newText.trim()) return;
    createText.mutate(
      { pole: field, nazev: newNazev.trim(), text: newText.trim() },
      {
        onSuccess: () => {
          setNewNazev('');
          setNewText('');
          setAdding(false);
        },
      },
    );
  };

  const handleDelete = (id: number) => setDeleteTargetId(id);

  const handleConfirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteText.mutate(deleteTargetId);
    setDeleteTargetId(null);
  };

  const handleSaveAsCurrent = async () => {
    if (!value.trim()) return;
    const nazev = window.prompt('Název předvolby:');
    if (!nazev?.trim()) return;
    createText.mutate({ pole: field, nazev: nazev.trim(), text: value.trim() });
  };

  const applyText = (text: string) => {
    const newVal = mode === 'append' && value ? value + '\n' + text : text;
    onChange(newVal);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      {value.trim() && (
        <button
          type="button"
          onClick={handleSaveAsCurrent}
          className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          title="Uložit aktuální text jako předvolbu"
        >
          Uložit
        </button>
      )}
      <button
        type="button"
        onClick={() => { setOpen(!open); setAdding(false); }}
        className="text-xs text-[var(--text-muted)] hover:text-slate-700 hover:bg-slate-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        title="Předvolené texty"
      >
        Předvolby
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-xl min-w-[340px] max-w-[440px] py-1 max-h-96 overflow-y-auto">
          {/* Výchozí předvolby */}
          {builtIn.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)]">Výchozí předvolby</div>
              {builtIn.map((t, i) => (
                <button
                  key={`b-${i}`}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer border-b border-[var(--border-subtle)]"
                  onClick={() => applyText(t.text)}
                >
                  <div className="text-xs font-semibold text-blue-700">{t.label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{t.text}</div>
                </button>
              ))}
            </>
          )}
          {/* Vlastní předvolby */}
          {custom.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-600 font-semibold border-b border-[var(--border-subtle)] mt-1">Vlastní předvolby</div>
              {custom.map((t) => (
                <div key={`c-${t.id}`} className="flex items-start group">
                  <button
                    type="button"
                    className="flex-1 text-left px-3 py-2 hover:bg-emerald-50 transition-colors cursor-pointer border-b border-[var(--border-subtle)]"
                    onClick={() => applyText(t.text)}
                  >
                    <div className="text-xs font-semibold text-emerald-700">{t.nazev}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{t.text}</div>
                  </button>
                  <button
                    type="button"
                    className="px-2 py-2 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => t.id && handleDelete(t.id)}
                    title="Smazat"
                  >✕</button>
                </div>
              ))}
            </>
          )}
          {/* Přidat novou */}
          <div className="border-t border-[var(--border)] mt-1">
            {!adding ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
                onClick={() => setAdding(true)}
              >
                + Přidat vlastní předvolbu
              </button>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                <input
                  type="text"
                  placeholder="Název předvolby"
                  value={newNazev}
                  onChange={(e) => setNewNazev(e.target.value)}
                  className="w-full text-xs px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none"
                  autoFocus
                />
                <textarea
                  placeholder="Text předvolby"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:outline-none resize-none"
                />
                <div className="flex gap-1 justify-end">
                  <button type="button" onClick={() => setAdding(false)} className="px-2 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded cursor-pointer">Zrušit</button>
                  <button type="button" onClick={handleAdd} className="px-2 py-0.5 text-xs bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] cursor-pointer" disabled={!newNazev.trim() || !newText.trim()}>Uložit</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Smazat předvolbu"
        message="Smazat tuto vlastní předvolbu?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
