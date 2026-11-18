import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Select, Badge, PageHeader, Textarea } from '../components/ui';
import {
  useFaktura, useCreateFaktura, useUpdateFaktura, useZmenStavFaktury,
  useZakaznici, useCenik, useNastaveni,
} from '../hooks/useQueries';
import type { Faktura, FakturaStav } from '../types';
import { STAV_LABEL, FORMA_UHRADY_OPTIONS, chybaZmenyStavu } from './fakturaUi';
import { PolozkyDokladu } from '../components/PolozkyDokladu';
import { novyRadek, radkyZPolozek, radkyNaPolozky, celkemRadku, type RadekState } from '../components/polozkyDokladuModel';

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

const dateOnly = (d?: string): string => (d ? d.slice(0, 10) : '');
const isoDate = (d: Date): string => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};


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
      setRadky(radkyZPolozek(faktura.polozky));
      setInitializedFor(faktura.id);
    }
  }, [isNew, faktura, nastaveni, initializedFor]);

  const celkem = useMemo(() => celkemRadku(radky), [radky]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

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
    polozky: radkyNaPolozky(radky),
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'Nová faktura' : faktura?.cisloFaktury ? `Faktura ${faktura.cisloFaktury}` : 'Koncept faktury'}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant={stav === 'zaplacena' ? 'success' : stav === 'storno' ? 'danger' : stav === 'vystavena' ? 'info' : 'neutral'}>
              {STAV_LABEL[stav]}
            </Badge>
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
        }
      />

      {readOnly && (
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg px-3 py-2">
          Vystavená faktura je pouze ke čtení.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
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
          <PolozkyDokladu radky={radky} setRadky={setRadky} cenik={cenik} readOnly={readOnly} />
        </Card>

        <Card title="Poznámka">
          <Textarea
            aria-label="Poznámka"
            value={form.poznamka}
            onChange={(e) => setField('poznamka', e.target.value)}
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

    </div>
  );
};

export default FakturaForm;
