import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Select, Badge, Modal } from '../components/ui';
import {
  useFaktura, useCreateFaktura, useUpdateFaktura, useZmenStavFaktury,
  useZakaznici, useCenik, useNastaveni,
} from '../hooks/useQueries';
import { spoctiCelkem, spoctiPolozku } from '../services/fakturaUtils';
import type { Faktura, FakturaStav, CenikPolozka } from '../types';
import { STAV_LABEL, FORMA_UHRADY_OPTIONS, formatKc, chybaZmenyStavu } from './fakturaUi';

interface RadekState {
  key: number;
  popis: string;
  mnozstvi: string;
  jednotka: string;
  cena: string;
}

interface FormState {
  zakaznikId: string;
  odberatelNazev: string;
  odberatelAdresa: string;
  odberatelIco: string;
  odberatelDic: string;
  datumVystaveni: string;
  datumZdanitelnehoPlneni: string;
  datumSplatnosti: string;
  formaUhrady: string;
  poznamka: string;
}

const toNum = (s: string): number => {
  const n = Number(String(s).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const dateOnly = (d?: string): string => (d ? d.slice(0, 10) : '');
const isoDate = (d: Date): string => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

let radekCounter = 0;
const novyRadek = (p?: Partial<RadekState>): RadekState => ({
  key: ++radekCounter, popis: '', mnozstvi: '1', jednotka: 'ks', cena: '0', ...p,
});

const EMPTY_FORM: FormState = {
  zakaznikId: '', odberatelNazev: '', odberatelAdresa: '', odberatelIco: '', odberatelDic: '',
  datumVystaveni: '', datumZdanitelnehoPlneni: '', datumSplatnosti: '', formaUhrady: 'prevod', poznamka: '',
};

const FakturaForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fakturaId = id ? parseInt(id, 10) : undefined;
  const isNew = fakturaId === undefined;

  const { data: faktura, isLoading } = useFaktura(fakturaId);
  const { data: zakaznici = [] } = useZakaznici();
  const { data: cenik = [] } = useCenik();
  const { data: nastaveni } = useNastaveni();
  const createFaktura = useCreateFaktura();
  const updateFaktura = useUpdateFaktura();
  const zmenStav = useZmenStavFaktury();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [radky, setRadky] = useState<RadekState[]>(() => [novyRadek()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cenikOpen, setCenikOpen] = useState(false);
  const [initializedFor, setInitializedFor] = useState<number | 'new' | null>(null);

  const stav: FakturaStav = faktura?.stav ?? 'koncept';
  const readOnly = !isNew && stav !== 'koncept';

  // Inicializace formuláře: nová faktura = výchozí data, existující = z načtené faktury
  useEffect(() => {
    if (isNew) {
      if (initializedFor === 'new' || nastaveni === undefined) return;
      const dnes = new Date();
      const splatnost = new Date(dnes);
      splatnost.setDate(splatnost.getDate() + (nastaveni?.splatnostDni ?? 14));
      setForm({
        ...EMPTY_FORM,
        datumVystaveni: isoDate(dnes),
        datumZdanitelnehoPlneni: isoDate(dnes),
        datumSplatnosti: isoDate(splatnost),
      });
      setInitializedFor('new');
    } else if (faktura && initializedFor !== faktura.id) {
      setForm({
        zakaznikId: faktura.zakaznikId ? String(faktura.zakaznikId) : '',
        odberatelNazev: faktura.odberatelNazev || '',
        odberatelAdresa: faktura.odberatelAdresa || '',
        odberatelIco: faktura.odberatelIco || '',
        odberatelDic: faktura.odberatelDic || '',
        datumVystaveni: dateOnly(faktura.datumVystaveni),
        datumZdanitelnehoPlneni: dateOnly(faktura.datumZdanitelnehoPlneni),
        datumSplatnosti: dateOnly(faktura.datumSplatnosti),
        formaUhrady: faktura.formaUhrady || 'prevod',
        poznamka: faktura.poznamka || '',
      });
      const polozky = faktura.polozky ?? [];
      setRadky(
        polozky.length
          ? polozky.map(p => novyRadek({
              popis: p.popis, mnozstvi: String(p.mnozstvi), jednotka: p.jednotka || '', cena: String(p.cenaZaJednotku),
            }))
          : [novyRadek()],
      );
      setInitializedFor(faktura.id);
    }
  }, [isNew, faktura, nastaveni, initializedFor]);

  const celkem = useMemo(
    () => spoctiCelkem(radky.map(r => ({ mnozstvi: toNum(r.mnozstvi), cenaZaJednotku: toNum(r.cena) }))),
    [radky],
  );

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const updateRadek = (key: number, patch: Partial<RadekState>) =>
    setRadky(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const handleZakaznik = (value: string) => {
    const z = zakaznici.find(x => String(x.id) === value);
    if (!z) {
      setField('zakaznikId', '');
      return;
    }
    setForm(f => ({
      ...f,
      zakaznikId: value,
      odberatelNazev: z.nazev || '',
      odberatelAdresa: z.adresa || '',
      odberatelIco: z.ico || '',
      odberatelDic: z.dic || '',
    }));
  };

  const pridatZCeniku = (c: CenikPolozka) => {
    setRadky(rs => {
      const novy = novyRadek({ popis: c.nazev, mnozstvi: '1', jednotka: c.jednotka || '', cena: String(c.cena) });
      // prázdný výchozí řádek nahradíme
      const jenPrazdny = rs.length === 1 && !rs[0].popis.trim() && toNum(rs[0].cena) === 0;
      return jenPrazdny ? [novy] : [...rs, novy];
    });
    setCenikOpen(false);
  };

  const buildPayload = (): Partial<Faktura> => ({
    zakaznikId: form.zakaznikId ? Number(form.zakaznikId) : undefined,
    odberatelNazev: form.odberatelNazev.trim(),
    odberatelAdresa: form.odberatelAdresa || undefined,
    odberatelIco: form.odberatelIco || undefined,
    odberatelDic: form.odberatelDic || undefined,
    datumVystaveni: form.datumVystaveni || undefined,
    datumZdanitelnehoPlneni: form.datumZdanitelnehoPlneni || undefined,
    datumSplatnosti: form.datumSplatnosti || undefined,
    formaUhrady: form.formaUhrady,
    poznamka: form.poznamka || undefined,
    celkem,
    polozky: radky
      .filter(r => r.popis.trim())
      .map((r, i) => ({
        poradi: i + 1,
        popis: r.popis.trim(),
        mnozstvi: toNum(r.mnozstvi),
        jednotka: r.jednotka || undefined,
        cenaZaJednotku: toNum(r.cena),
        celkem: spoctiPolozku(toNum(r.mnozstvi), toNum(r.cena)),
      })),
  });

  /** Uloží koncept, vrátí id faktury. */
  const ulozit = async (): Promise<number> => {
    const payload = buildPayload();
    if (isNew) {
      return await createFaktura.mutateAsync(payload);
    }
    await updateFaktura.mutateAsync({ id: fakturaId!, data: payload });
    return fakturaId!;
  };

  const validate = (): string | null => {
    if (!form.odberatelNazev.trim()) return 'Vyplňte odběratele.';
    if (!radky.some(r => r.popis.trim())) return 'Přidejte alespoň jednu položku.';
    return null;
  };

  const handleSave = async (vystavit: boolean) => {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setSaving(true);
    let savedId: number | undefined;
    try {
      savedId = await ulozit();
    } catch (e) {
      console.error('Chyba při ukládání faktury:', e);
      setError('Nepodařilo se uložit fakturu');
      setSaving(false);
      return;
    }
    try {
      if (vystavit && savedId) {
        await zmenStav.mutateAsync({ id: savedId, stav: 'vystavena' });
      }
      navigate('/faktury');
    } catch (e) {
      setError(`Koncept byl uložen, ale fakturu se nepodařilo vystavit. ${chybaZmenyStavu(e)}`);
      if (isNew && savedId) navigate(`/faktury/${savedId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const handleStav = async (novy: Exclude<FakturaStav, 'koncept'>) => {
    if (!fakturaId) return;
    setError(null);
    try {
      await zmenStav.mutateAsync({ id: fakturaId, stav: novy });
    } catch (e) {
      setError(chybaZmenyStavu(e));
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
      </div>
    );
  }
  if (!isNew && !faktura) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-[var(--text-secondary)] mb-4">Faktura nebyla nalezena.</p>
        <Button variant="secondary" onClick={() => navigate('/faktury')}>← Zpět na faktury</Button>
      </div>
    );
  }

  const zakaznikOptions = [
    { value: '', label: '— bez zákazníka / ručně —' },
    ...zakaznici.map(z => ({ value: String(z.id), label: z.nazev })),
  ];
  const aktivniCenik = cenik.filter(c => c.aktivni);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h1 className="text-sm font-bold text-[var(--text)]">
            {isNew ? 'Nová faktura' : faktura?.cisloFaktury ? `Faktura ${faktura.cisloFaktury}` : 'Koncept faktury'}
          </h1>
          <div className="mt-1">
            <Badge variant={stav === 'zaplacena' ? 'success' : stav === 'storno' ? 'danger' : stav === 'vystavena' ? 'info' : 'neutral'}>
              {STAV_LABEL[stav]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => navigate('/faktury')}>← Zpět</Button>
          {!isNew && stav !== 'storno' && (
            <Button variant="secondary" onClick={() => window.open(`/faktura/${fakturaId}/nahled`, '_blank')}>Tisk</Button>
          )}
          {readOnly && stav === 'vystavena' && (
            <>
              <Button variant="success" onClick={() => handleStav('zaplacena')}>Označit zaplacenou</Button>
              <Button variant="warning" onClick={() => handleStav('storno')}>Storno</Button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg px-3 py-2">
          Vystavená faktura je pouze ke čtení.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-red-500/[0.10] border border-red-500/[0.25] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <fieldset disabled={readOnly} className="space-y-6 min-w-0">
        <Card title="Odběratel">
          <div className="space-y-4">
            <Select
              label="Zákazník"
              options={zakaznikOptions}
              value={form.zakaznikId}
              onChange={(e) => handleZakaznik(e.target.value)}
            />
            <Input label="Název / Jméno *" value={form.odberatelNazev} onChange={(e) => setField('odberatelNazev', e.target.value)} />
            <Input label="Adresa" value={form.odberatelAdresa} onChange={(e) => setField('odberatelAdresa', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="IČO" value={form.odberatelIco} onChange={(e) => setField('odberatelIco', e.target.value)} />
              <Input label="DIČ" value={form.odberatelDic} onChange={(e) => setField('odberatelDic', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Údaje faktury">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Datum vystavení" type="date" value={form.datumVystaveni} onChange={(e) => setField('datumVystaveni', e.target.value)} />
            <Input label="Datum zdanitelného plnění" type="date" value={form.datumZdanitelnehoPlneni} onChange={(e) => setField('datumZdanitelnehoPlneni', e.target.value)} />
            <Input label="Datum splatnosti" type="date" value={form.datumSplatnosti} onChange={(e) => setField('datumSplatnosti', e.target.value)} />
            <Select label="Forma úhrady" options={FORMA_UHRADY_OPTIONS} value={form.formaUhrady} onChange={(e) => setField('formaUhrady', e.target.value)} />
          </div>
        </Card>

        <Card title="Položky">
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-[1fr_80px_80px_110px_110px_32px] gap-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              <span>Popis</span><span>Množství</span><span>Jednotka</span><span>Cena / j.</span><span className="text-right">Celkem</span><span />
            </div>
            {radky.map((r, idx) => (
              <div key={r.key} className="grid grid-cols-2 md:grid-cols-[1fr_80px_80px_110px_110px_32px] gap-2 items-center" data-testid="radek">
                <div className="col-span-2 md:col-span-1">
                  <Input aria-label={`Popis položky ${idx + 1}`} placeholder="Popis" value={r.popis} onChange={(e) => updateRadek(r.key, { popis: e.target.value })} />
                </div>
                <Input aria-label={`Množství ${idx + 1}`} inputMode="decimal" value={r.mnozstvi} onChange={(e) => updateRadek(r.key, { mnozstvi: e.target.value })} />
                <Input aria-label={`Jednotka ${idx + 1}`} value={r.jednotka} onChange={(e) => updateRadek(r.key, { jednotka: e.target.value })} />
                <Input aria-label={`Cena za jednotku ${idx + 1}`} inputMode="decimal" value={r.cena} onChange={(e) => updateRadek(r.key, { cena: e.target.value })} />
                <span className="text-xs text-right text-[var(--text)] whitespace-nowrap" data-testid="radek-celkem">
                  {formatKc(spoctiPolozku(toNum(r.mnozstvi), toNum(r.cena)))}
                </span>
                {!readOnly && (
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Odebrat položku ${idx + 1}`}
                    disabled={radky.length === 1}
                    onClick={() => setRadky(rs => rs.filter(x => x.key !== r.key))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => setRadky(rs => [...rs, novyRadek()])}>+ Přidat položku</Button>
                <Button variant="secondary" size="sm" onClick={() => setCenikOpen(true)}>Přidat z ceníku</Button>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <span className="text-sm font-bold text-[var(--text)]" data-testid="celkem">Celkem: {formatKc(celkem)}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] text-right">Nejsem plátce DPH.</p>
          </div>
        </Card>

        <Card title="Poznámka">
          <textarea
            value={form.poznamka}
            onChange={(e) => setField('poznamka', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
            rows={3}
          />
        </Card>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/faktury')}>Zrušit</Button>
          <Button variant="secondary" disabled={saving} onClick={() => handleSave(false)}>Uložit koncept</Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>Uložit a vystavit</Button>
        </div>
      )}

      <Modal isOpen={cenikOpen} onClose={() => setCenikOpen(false)} title="Přidat z ceníku">
        <div className="space-y-2">
          {aktivniCenik.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-4">Ceník je prázdný.</p>
          ) : (
            aktivniCenik.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => pridatZCeniku(c)}
                className="w-full flex justify-between items-center p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] text-left cursor-pointer"
              >
                <span className="text-xs text-[var(--text)]">{c.nazev}</span>
                <span className="text-xs text-[var(--text-secondary)]">{formatKc(c.cena)}{c.jednotka ? ` / ${c.jednotka}` : ''}</span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FakturaForm;
