import { useState } from 'react';
import { aiApi } from '../services/api';
import { Button, Modal } from './ui';

interface AIAutofillButtonProps {
  /** Název pole k vyplnění */
  field: string;
  /** Aktuální data formuláře */
  formData: Record<string, any>;
  /** Typ entity (revize, mistnost, rozvadec, zarizeni) */
  entityType: string;
  /** Callback pro aplikování navržených hodnot */
  onApply: (values: Record<string, string>) => void;
  /** Lidský název pole (titulek okna) */
  fieldLabel?: string;
  /** Nápověda, co do základních údajů napsat */
  hint?: string;
}

const textareaCls =
  'w-full px-2.5 py-2 rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none resize-y';

/**
 * Tlačítko „AI“: otevře okno, kam technik napíše základní údaje (v bodech, hovorově),
 * AI z nich sestaví odborný text a ten se po kontrole vloží do pole.
 */
export function AIAutofillButton({ field, formData, entityType, onApply, fieldLabel, hint }: AIAutofillButtonProps) {
  const [open, setOpen] = useState(false);
  const [pokyny, setPokyny] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentValue = String(formData?.[field] ?? '');

  const handleOpen = () => {
    setResult(null);
    setError(null);
    setOpen(true);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { suggestion } = await aiApi.autofill(field, formData, entityType, pokyny.trim() || undefined);
      const text = suggestion[field];
      if (text) setResult(text);
      else setError('AI nenavrhla žádný text. Zkuste doplnit více údajů.');
    } catch (err: any) {
      setError(err.message || 'Chyba AI návrhu');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (mode: 'replace' | 'append') => {
    if (result == null) return;
    const value = mode === 'append' && currentValue.trim() ? `${currentValue.trim()}\n${result}` : result;
    onApply({ [field]: value });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="AI návrh textu"
        aria-label="AI návrh textu"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--bg-accent)] text-[var(--primary-text)] border border-[var(--primary)]/25 hover:brightness-110 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
        </svg>
        AI
      </button>

      <Modal
        isOpen={open}
        onClose={() => !loading && setOpen(false)}
        title={`AI návrh – ${fieldLabel || field}`}
        size="lg"
        footer={
          result == null ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>Zrušit</Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generuji…' : 'Vygenerovat'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setResult(null)} disabled={loading}>← Upravit údaje</Button>
              <Button variant="secondary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generuji…' : 'Znovu'}
              </Button>
              {currentValue.trim() && (
                <Button variant="secondary" onClick={() => handleApply('append')} disabled={loading}>Připojit</Button>
              )}
              <Button onClick={() => handleApply('replace')} disabled={loading}>
                {currentValue.trim() ? 'Nahradit' : 'Vložit'}
              </Button>
            </div>
          )
        }
      >
        {result == null ? (
          <div className="space-y-2">
            <label htmlFor={`ai-pokyny-${field}`} className="text-xs font-semibold text-[var(--text-secondary)]">
              Základní údaje (stačí v bodech, AI z nich sestaví odborný text)
            </label>
            <textarea
              id={`ai-pokyny-${field}`}
              className={textareaCls}
              rows={6}
              autoFocus
              value={pokyny}
              onChange={(e) => setPokyny(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !loading) handleGenerate();
              }}
              placeholder={hint || 'Např. rodinný dům, 2 podlaží, rok výstavby 1995, TN-C-S, hlavní jistič 3×25 A, 1 rozvaděč v chodbě…'}
              disabled={loading}
            />
            <p className="text-xs text-[var(--text-secondary)]">
              Použijí se i údaje, které už v revizi máte (název, adresa, typ, kategorie…).
              {currentValue.trim() && ' Současný text pole AI vezme v úvahu a může ho vylepšit.'}
              {' '}Ctrl+Enter = vygenerovat.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor={`ai-vysledek-${field}`} className="text-xs font-semibold text-[var(--text-secondary)]">
              Návrh (můžete ho před vložením upravit)
            </label>
            <textarea
              id={`ai-vysledek-${field}`}
              className={textareaCls}
              rows={10}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-[var(--text-secondary)]">AI může dělat chyby – text před vložením zkontrolujte.</p>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger-text)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
