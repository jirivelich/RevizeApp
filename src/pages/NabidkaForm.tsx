import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Select, Badge, PageHeader, Textarea } from '../components/ui';
import { useZakaznici, useCenik } from '../hooks/useQueries';
import type { Nabidka, NabidkaStav } from '../types';
import { formatKc } from './fakturaUi';
import { PolozkyDokladu } from '../components/PolozkyDokladu';
import { novyRadek, radkyZPolozek, radkyNaPolozky, celkemRadku, type RadekState } from '../components/polozkyDokladuModel';
import {
  useNabidka, useCreateNabidka, useUpdateNabidka, useZmenStavNabidky, useNabidkaNaFakturu,
  NABIDKA_STAV_LABEL, NABIDKA_STAV_VARIANT,
} from '../services/nabidky';

/** Výchozí platnost nové nabídky ve dnech. */
const PLATNOST_DNI = 30;

interface FormState {
  zakaznikId: string;
  odberatelNazev: string;
  odberatelAdresa: string;
  odberatelIco: string;
  odberatelDic: string;
  odberatelEmail: string;
  predmet: string;
  misto: string;
  datumVystaveni: string;
  platnostDo: string;
  terminOd: string;
  terminDo: string;
  poznamka: string;
}

const EMPTY: FormState = {
  zakaznikId: '', odberatelNazev: '', odberatelAdresa: '', odberatelIco: '', odberatelDic: '', odberatelEmail: '',
  predmet: '', misto: '', datumVystaveni: '', platnostDo: '', terminOd: '', terminDo: '', poznamka: '',
};

const isoDate = (d: Date): string => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dateOnly = (d?: string | null): string => (d ? d.slice(0, 10) : '');

const NabidkaForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const nabidkaId = id ? parseInt(id, 10) : undefined;
  const isNew = nabidkaId === undefined;

  const { data: nabidka, isLoading } = useNabidka(nabidkaId);
  const { data: zakaznici = [] } = useZakaznici();
  const { data: cenik = [] } = useCenik();
  const create = useCreateNabidka();
  const update = useUpdateNabidka();
  const zmenStav = useZmenStavNabidky();
  const naFakturu = useNabidkaNaFakturu();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [radky, setRadky] = useState<RadekState[]>(() => [novyRadek()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initializedFor, setInitializedFor] = useState<number | 'new' | null>(null);

  const stav: NabidkaStav = nabidka?.stav ?? 'koncept';
  const readOnly = !isNew && (stav === 'prijata' || stav === 'odmitnuta');

  useEffect(() => {
    if (isNew) {
      if (initializedFor === 'new') return;
      const dnes = new Date();
      const platnost = new Date(dnes);
      platnost.setDate(platnost.getDate() + PLATNOST_DNI);
      setForm({ ...EMPTY, datumVystaveni: isoDate(dnes), platnostDo: isoDate(platnost) });
      setInitializedFor('new');
    } else if (nabidka && initializedFor !== nabidka.id) {
      setForm({
        zakaznikId: nabidka.zakaznikId ? String(nabidka.zakaznikId) : '',
        odberatelNazev: nabidka.odberatelNazev || '',
        odberatelAdresa: nabidka.odberatelAdresa || '',
        odberatelIco: nabidka.odberatelIco || '',
        odberatelDic: nabidka.odberatelDic || '',
        odberatelEmail: nabidka.odberatelEmail || '',
        predmet: nabidka.predmet || '',
        misto: nabidka.misto || '',
        datumVystaveni: dateOnly(nabidka.datumVystaveni),
        platnostDo: dateOnly(nabidka.platnostDo),
        terminOd: dateOnly(nabidka.terminOd),
        terminDo: dateOnly(nabidka.terminDo),
        poznamka: nabidka.poznamka || '',
      });
      setRadky(radkyZPolozek(nabidka.polozky));
      setInitializedFor(nabidka.id);
    }
  }, [isNew, nabidka, initializedFor]);

  const celkem = useMemo(() => celkemRadku(radky), [radky]);
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleZakaznik = (value: string) => {
    const z = zakaznici.find(x => String(x.id) === value);
    if (!z) { setField('zakaznikId', ''); return; }
    setForm(f => ({
      ...f,
      zakaznikId: value,
      odberatelNazev: z.nazev || '',
      odberatelAdresa: z.adresa || '',
      odberatelIco: z.ico || '',
      odberatelDic: z.dic || '',
      odberatelEmail: z.email || '',
    }));
  };

  const payload = (): Partial<Nabidka> => ({
    zakaznikId: form.zakaznikId ? Number(form.zakaznikId) : null,
    odberatelNazev: form.odberatelNazev.trim(),
    odberatelAdresa: form.odberatelAdresa, odberatelIco: form.odberatelIco, odberatelDic: form.odberatelDic,
    odberatelEmail: form.odberatelEmail,
    predmet: form.predmet, misto: form.misto,
    datumVystaveni: form.datumVystaveni, platnostDo: form.platnostDo, terminOd: form.terminOd, terminDo: form.terminDo,
    poznamka: form.poznamka,
    polozky: radkyNaPolozky(radky),
  });

  /** Uloží nabídku; vrátí její id. */
  const ulozit = async (): Promise<number | null> => {
    if (!form.odberatelNazev.trim()) { setError('Vyplňte odběratele.'); return null; }
    if (!radky.some(r => r.popis.trim())) { setError('Přidejte alespoň jednu položku.'); return null; }
    setError(null);
    setSaving(true);
    try {
      if (isNew) return await create.mutateAsync(payload());
      await update.mutateAsync({ id: nabidkaId!, data: payload() });
      return nabidkaId!;
    } catch (e) {
      setError((e as Error).message || 'Nabídku se nepodařilo uložit');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleUlozit = async () => {
    const savedId = await ulozit();
    if (savedId && isNew) navigate(`/nabidky/${savedId}`, { replace: true });
  };

  const handleStav = async (novy: NabidkaStav) => {
    if (!nabidkaId) return;
    setError(null);
    try {
      if (!readOnly && (await ulozit()) === null) return;
      await zmenStav.mutateAsync({ id: nabidkaId, stav: novy });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleFaktura = async () => {
    if (!nabidkaId) return;
    setError(null);
    try {
      if (!readOnly && (await ulozit()) === null) return;
      const fakturaId = await naFakturu.mutateAsync(nabidkaId);
      navigate(`/faktury/${fakturaId}`);
    } catch (e) {
      setError((e as Error).message || 'Fakturu se nepodařilo vytvořit');
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
      </div>
    );
  }
  if (!isNew && !nabidka) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-[var(--text-secondary)] mb-4">Nabídka nebyla nalezena.</p>
        <Button variant="secondary" onClick={() => navigate('/nabidky')}>← Zpět na nabídky</Button>
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
        title={isNew ? 'Nová cenová nabídka' : `Cenová nabídka ${nabidka?.cislo ?? ''}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant={NABIDKA_STAV_VARIANT[stav]}>{NABIDKA_STAV_LABEL[stav]}</Badge>
            <Button variant="secondary" onClick={() => navigate('/nabidky')}>← Zpět</Button>
            {!isNew && (
              <Button variant="secondary" onClick={() => window.open(`/nabidka/${nabidkaId}/nahled`, '_blank')}>Tisk / PDF</Button>
            )}
          </div>
        }
      />

      {readOnly && (
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg px-3 py-2">
          {stav === 'prijata' ? 'Přijatá' : 'Odmítnutá'} nabídka je pouze ke čtení. Pro úpravy ji vraťte do stavu „Odeslaná“.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">{error}</p>
      )}

      <fieldset disabled={readOnly} className="space-y-6 min-w-0">
        <Card title="Odběratel">
          <div className="space-y-4">
            <Select label="Zákazník" options={zakaznikOptions} value={form.zakaznikId} onChange={(e) => handleZakaznik(e.target.value)} />
            <Input label="Název / Jméno *" value={form.odberatelNazev} onChange={(e) => setField('odberatelNazev', e.target.value)} />
            <Input label="Adresa" value={form.odberatelAdresa} onChange={(e) => setField('odberatelAdresa', e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="IČO" value={form.odberatelIco} onChange={(e) => setField('odberatelIco', e.target.value)} />
              <Input label="DIČ" value={form.odberatelDic} onChange={(e) => setField('odberatelDic', e.target.value)} />
              <Input label="E-mail" type="email" value={form.odberatelEmail} onChange={(e) => setField('odberatelEmail', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Údaje nabídky">
          <div className="space-y-4">
            <Input label="Předmět nabídky" placeholder="např. Revize elektroinstalace rodinného domu" value={form.predmet} onChange={(e) => setField('predmet', e.target.value)} />
            <Input label="Místo plnění" value={form.misto} onChange={(e) => setField('misto', e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Datum vystavení" type="date" value={form.datumVystaveni} onChange={(e) => setField('datumVystaveni', e.target.value)} />
              <Input label="Platnost nabídky do" type="date" value={form.platnostDo} onChange={(e) => setField('platnostDo', e.target.value)} />
              <Input label="Předpokládaný termín od" type="date" value={form.terminOd} onChange={(e) => setField('terminOd', e.target.value)} />
              <Input label="Předpokládaný termín do" type="date" value={form.terminDo} onChange={(e) => setField('terminDo', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Položky">
          <PolozkyDokladu radky={radky} setRadky={setRadky} cenik={cenik} readOnly={readOnly} />
        </Card>

        <Card title="Poznámka">
          <Textarea aria-label="Poznámka" placeholder="Např. podmínky, co je/není součástí nabídky…" value={form.poznamka} onChange={(e) => setField('poznamka', e.target.value)} rows={3} />
        </Card>
      </fieldset>

      <div className="flex justify-end gap-2 flex-wrap">
        <span className="mr-auto self-center text-sm text-[var(--text-secondary)]">Celkem <strong className="text-[var(--text)] tabular-nums">{formatKc(celkem)}</strong></span>
        {!readOnly && <Button variant="secondary" disabled={saving} onClick={handleUlozit}>Uložit</Button>}
        {!isNew && stav === 'koncept' && <Button variant="secondary" disabled={saving} onClick={() => handleStav('odeslana')}>Označit jako odeslanou</Button>}
        {!isNew && stav === 'odeslana' && <Button variant="secondary" disabled={saving} onClick={() => handleStav('odmitnuta')}>Odmítnuta</Button>}
        {!isNew && (stav === 'prijata' || stav === 'odmitnuta') && !nabidka?.fakturaId && (
          <Button variant="secondary" onClick={() => handleStav('odeslana')}>Vrátit do „Odeslaná“</Button>
        )}
        {!isNew && nabidka?.fakturaId ? (
          <Button onClick={() => navigate(`/faktury/${nabidka.fakturaId}`)}>Otevřít fakturu</Button>
        ) : !isNew && stav !== 'odmitnuta' && (
          <Button disabled={saving || naFakturu.isPending} onClick={handleFaktura}>Přijata → vytvořit fakturu</Button>
        )}
      </div>
    </div>
  );
};

export default NabidkaForm;
