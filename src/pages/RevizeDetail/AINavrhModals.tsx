import { useEffect, useState, type ReactNode } from 'react';
import { Button, Modal } from '../../components/ui';
import { aiApi, type AIMistnostNavrh, type AIZarizeniNavrh } from '../../services/api';

const PROSTREDI = ['Normální', 'Nebezpečné', 'Zvlášť nebezpečné'] as const;

const fieldCls =
  'w-full px-2 py-1.5 rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none';

/** Malé tlačítko „AI“ ve stylu ostatních akcí. */
export function AIButton({ onClick, title, disabled }: { onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <Button variant="secondary" size="sm" className="min-h-[40px] shrink-0" onClick={onClick} title={title} aria-label={title} disabled={disabled}>
      <svg className="h-3.5 w-3.5 text-[var(--primary-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
      </svg>
      AI
    </Button>
  );
}

// ==================== Společné dvoukrokové okno ====================

type Vybrane<T> = T & { _vybrano: boolean };

interface NavrhModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  popisLabel: string;
  popisPlaceholder: string;
  popisPovinny: boolean;
  popisNapoveda?: ReactNode;
  generate: (popis: string) => Promise<T[]>;
  renderRow: (item: Vybrane<T>, update: (patch: Partial<Vybrane<T>>) => void) => ReactNode;
  onConfirm: (items: T[]) => Promise<void>;
  prazdnyText: string;
}

function NavrhModal<T>({
  isOpen, onClose, title, popisLabel, popisPlaceholder, popisPovinny, popisNapoveda,
  generate, renderRow, onConfirm, prazdnyText,
}: NavrhModalProps<T>) {
  const [popis, setPopis] = useState('');
  const [items, setItems] = useState<Vybrane<T>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setItems(null); setError(null); }
  }, [isOpen]);

  const busy = loading || saving;
  const vybrane = items?.filter((i) => i._vybrano) ?? [];

  const handleGenerate = async () => {
    if (popisPovinny && !popis.trim()) { setError('Nejdřív něco napište.'); return; }
    setLoading(true);
    setError(null);
    try {
      const out = await generate(popis.trim());
      setItems(out.map((i) => ({ ...i, _vybrano: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba AI návrhu');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await onConfirm(vybrane.map(({ _vybrano, ...rest }) => rest as T));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení se nezdařilo');
    } finally {
      setSaving(false);
    }
  };

  const update = (idx: number) => (patch: Partial<Vybrane<T>>) =>
    setItems((prev) => prev && prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={title}
      size="lg"
      footer={
        items == null ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Zrušit</Button>
            <Button onClick={handleGenerate} disabled={busy}>{loading ? 'Generuji…' : 'Navrhnout'}</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setItems(null)} disabled={busy}>← Upravit popis</Button>
            <Button variant="secondary" onClick={handleGenerate} disabled={busy}>{loading ? 'Generuji…' : 'Znovu'}</Button>
            <Button onClick={handleConfirm} disabled={busy || vybrane.length === 0}>
              {saving ? 'Ukládám…' : `Přidat vybrané (${vybrane.length})`}
            </Button>
          </div>
        )
      }
    >
      {items == null ? (
        <div className="space-y-2">
          <label htmlFor="ai-navrh-popis" className="text-xs font-semibold text-[var(--text-secondary)]">{popisLabel}</label>
          <textarea
            id="ai-navrh-popis"
            className={`${fieldCls} resize-y`}
            rows={6}
            autoFocus
            value={popis}
            onChange={(e) => setPopis(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !busy) handleGenerate(); }}
            placeholder={popisPlaceholder}
            disabled={busy}
          />
          <p className="text-xs text-[var(--text-secondary)]">{popisNapoveda} Ctrl+Enter = navrhnout.</p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{prazdnyText}</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Zkontrolujte a upravte návrh, odškrtněte, co nechcete.</span>
            <button
              type="button"
              className="underline hover:text-[var(--text)]"
              onClick={() => {
                const vse = vybrane.length !== items.length;
                setItems(items.map((i) => ({ ...i, _vybrano: vse })));
              }}
            >
              {vybrane.length !== items.length ? 'Vybrat vše' : 'Zrušit výběr'}
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {items.map((item, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-2 p-2 rounded-[var(--radius-md)] border ${item._vybrano ? 'border-[var(--border-input)] bg-[var(--surface)]' : 'border-transparent bg-[var(--bg-input)] opacity-60'}`}
              >
                <input
                  type="checkbox"
                  className="mt-2.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  checked={item._vybrano}
                  onChange={(e) => update(idx)({ _vybrano: e.target.checked } as Partial<Vybrane<T>>)}
                  aria-label="Vybrat položku"
                  disabled={busy}
                />
                <div className="flex-1 min-w-0">{renderRow(item, update(idx))}</div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--text-secondary)]">AI může dělat chyby – návrh před přidáním zkontrolujte.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger-text)] bg-[var(--danger-bg)] rounded-[var(--radius-md)] px-3 py-2">{error}</p>
      )}
    </Modal>
  );
}

// ==================== Místnosti ====================

export function AIMistnostiModal({ isOpen, onClose, revizeId, existujici, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  revizeId: number;
  /** Názvy místností, které už v revizi jsou (označí se duplicity). */
  existujici: string[];
  onConfirm: (mistnosti: AIMistnostNavrh[]) => Promise<void>;
}) {
  const existujiciSet = new Set(existujici.map((n) => n.trim().toLowerCase()));
  return (
    <NavrhModal<AIMistnostNavrh>
      isOpen={isOpen}
      onClose={onClose}
      title="AI návrh místností"
      popisLabel="Popis objektu (stačí v bodech)"
      popisPlaceholder={'Např. rodinný dům:\n1.NP – zádveří, chodba, kuchyň s obývákem 35 m², koupelna se sprchou, WC, technická místnost\n2.NP – 3 ložnice, koupelna s vanou, šatna\ngaráž'}
      popisPovinny
      popisNapoveda="AI navrhne místnosti s patrem a prostředím (koupelny, venkovní prostory apod. označí jako nebezpečné)."
      generate={async (popis) => (await aiApi.navrhMistnosti(popis, revizeId)).mistnosti}
      prazdnyText="AI nenavrhla žádné místnosti. Zkuste popis doplnit."
      onConfirm={onConfirm}
      renderRow={(m, update) => (
        <div className="grid grid-cols-6 gap-1.5">
          <input
            className={`${fieldCls} col-span-6 sm:col-span-3`}
            value={m.nazev}
            onChange={(e) => update({ nazev: e.target.value })}
            aria-label="Název místnosti"
          />
          <input
            className={`${fieldCls} col-span-2 sm:col-span-1`}
            value={m.patro}
            onChange={(e) => update({ patro: e.target.value })}
            placeholder="Patro"
            aria-label="Patro"
          />
          <select
            className={`${fieldCls} col-span-4 sm:col-span-2`}
            value={m.prostredi}
            onChange={(e) => update({ prostredi: e.target.value as AIMistnostNavrh['prostredi'] })}
            aria-label="Prostředí"
          >
            {PROSTREDI.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(m.poznamka || m.plocha || existujiciSet.has(m.nazev.trim().toLowerCase())) && (
            <p className="col-span-6 text-xs text-[var(--text-secondary)]">
              {existujiciSet.has(m.nazev.trim().toLowerCase()) && <span className="text-[var(--warning-text)] font-semibold">Už v revizi je. </span>}
              {m.plocha ? `${String(m.plocha).replace('.', ',')} m². ` : ''}
              {m.poznamka}
            </p>
          )}
        </div>
      )}
    />
  );
}

// ==================== Zařízení ====================

export function AIZarizeniModal({ isOpen, onClose, mistnost, existujici, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  mistnost: { nazev: string; patro?: string; prostredi?: string; poznamka?: string };
  existujici: string[];
  onConfirm: (zarizeni: AIZarizeniNavrh[]) => Promise<void>;
}) {
  return (
    <NavrhModal<AIZarizeniNavrh>
      isOpen={isOpen}
      onClose={onClose}
      title={`AI návrh zařízení – ${mistnost.nazev}`}
      popisLabel="Co v místnosti je? (nepovinné)"
      popisPlaceholder="Např. 6 zásuvek, 2 stropní svítidla, digestoř, sporák, myčka, bojler 80 l…"
      popisPovinny={false}
      popisNapoveda="Když nic nenapíšete, AI navrhne obvyklé vybavení podle názvu a prostředí místnosti. Zařízení, která už v místnosti jsou, nenavrhne znovu."
      generate={async (popis) => (await aiApi.navrhZarizeni(mistnost, popis || undefined, existujici)).zarizeni}
      prazdnyText="AI nenavrhla žádná další zařízení."
      onConfirm={onConfirm}
      renderRow={(z, update) => (
        <div className="grid grid-cols-6 gap-1.5">
          <input
            className={`${fieldCls} col-span-6 sm:col-span-3`}
            value={z.nazev}
            onChange={(e) => update({ nazev: e.target.value })}
            aria-label="Název zařízení"
          />
          <input
            className={`${fieldCls} col-span-2 sm:col-span-1`}
            value={z.oznaceni}
            onChange={(e) => update({ oznaceni: e.target.value })}
            placeholder="Ozn."
            aria-label="Označení"
          />
          <input
            className={`${fieldCls} col-span-2 sm:col-span-1`}
            type="number"
            min={1}
            value={z.pocetKs}
            onChange={(e) => update({ pocetKs: Math.max(1, parseInt(e.target.value) || 1) })}
            aria-label="Počet kusů"
            title="Počet kusů"
          />
          <select
            className={`${fieldCls} col-span-2 sm:col-span-1`}
            value={z.trida}
            onChange={(e) => update({ trida: e.target.value as AIZarizeniNavrh['trida'] })}
            aria-label="Třída ochrany"
            title="Třída ochrany"
          >
            <option value="I">tř. I</option>
            <option value="II">tř. II</option>
            <option value="III">tř. III</option>
          </select>
          {z.prikonW ? <p className="col-span-6 text-xs text-[var(--text-secondary)]">Příkon {z.prikonW} W</p> : null}
        </div>
      )}
    />
  );
}
