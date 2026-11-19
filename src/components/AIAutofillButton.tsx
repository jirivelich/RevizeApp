import { useState } from 'react';
import { aiApi } from '../services/api';

interface AIAutofillButtonProps {
  /** Název pole k vyplnění */
  field: string;
  /** Aktuální data formuláře */
  formData: Record<string, any>;
  /** Typ entity (revize, mistnost, rozvadec, zarizeni) */
  entityType: string;
  /** Callback pro aplikování navržených hodnot */
  onApply: (values: Record<string, string>) => void;
}

export function AIAutofillButton({ field, formData, entityType, onApply }: AIAutofillButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutofill = async () => {
    setLoading(true);
    setError(null);
    try {
      const { suggestion } = await aiApi.autofill(field, formData, entityType);
      if (Object.keys(suggestion).length > 0) {
        onApply(suggestion);
      } else {
        setError('AI nenavrhla žádný text.');
      }
    } catch (err: any) {
      console.error('AI autofill error:', err.message);
      setError(err.message || 'Chyba AI návrhu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAutofill}
      disabled={loading}
      title={error ? `AI návrh – ${error}` : 'AI návrh'}
      aria-label={error ? `AI návrh – ${error}` : 'AI návrh'}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border hover:brightness-110 disabled:opacity-50 transition-colors ${
        error
          ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger)]/40'
          : 'bg-[var(--bg-accent)] text-[var(--primary-text)] border-[var(--primary)]/25'
      }`}
    >
      {loading ? (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
        </svg>
      )}
      {error ? 'AI ⚠' : 'AI'}
    </button>
  );
}
