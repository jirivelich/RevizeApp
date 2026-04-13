import { Link } from 'react-router-dom';
import type { Revize, Firma, Nastaveni, Zakaznik } from '../../types';
import { TW, SectionHeader, Field } from './tw';

interface HromosvodInfoTabProps {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  firmy: Firma[];
  selectedFirmaId: string;
  setSelectedFirmaId: (id: string) => void;
  nastaveni: Nastaveni | null;
  zakaznici: Zakaznik[];
  selectedZakaznikId: string;
  setSelectedZakaznikId: (id: string) => void;
  saveNow?: () => void;
}

export function HromosvodInfoTab({
  revize, formData, setFormData,
  firmy, selectedFirmaId, setSelectedFirmaId,
  nastaveni, zakaznici, selectedZakaznikId, setSelectedZakaznikId,
  saveNow,
}: HromosvodInfoTabProps) {
  return (
    <div className={TW.page}>

      {/* ═══ 01 – IDENTIFIKACE ═══ */}
      <div className={TW.card}>
        <SectionHeader num="01">Identifikace revize</SectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            <Field label="Číslo revize">
              <input className={TW.inputDisabled} value={formData.cisloRevize || ''} disabled />
            </Field>
            <Field label="Typ revize">
              <select className={TW.select} value={formData.typRevize || ''} onChange={(e) => { setFormData({ ...formData, typRevize: e.target.value as any }); saveNow?.(); }}>
                <option value="pravidelná">Pravidelná</option>
                <option value="výchozí">Výchozí</option>
                <option value="mimořádná">Mimořádná</option>
              </select>
            </Field>
            <Field label="Kategorie">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Hromosvody
              </span>
            </Field>
            <div className="flex flex-col gap-1 col-span-2 max-sm:col-span-1">
              <label className={TW.label}>Název objektu</label>
              <input className={TW.input} value={formData.nazev || ''} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} />
            </div>
            <Field label="Adresa objektu">
              <input className={TW.input} value={formData.adresa || ''} onChange={(e) => setFormData({ ...formData, adresa: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-1 col-span-3 max-sm:col-span-1">
              <label className={TW.label}>Norma</label>
              <input className={TW.input} placeholder="ČSN EN 62305-1 až 4" value={formData.hromosvodNorma || ''} onChange={(e) => setFormData({ ...formData, hromosvodNorma: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 02 – OBJEDNATEL ═══ */}
      <div className={TW.card}>
        <SectionHeader num="02">Objednatel / Provozovatel</SectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            <Field label="Objednatel">
              <input className={TW.input} placeholder="Nebo vyberte zákazníka níže" value={formData.objednatel || ''} onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })} />
            </Field>
            <Field label="Ze zákazníků">
              <select className={TW.selectFull} value={selectedZakaznikId} onChange={(e) => {
                const zakaznikId = e.target.value;
                setSelectedZakaznikId(zakaznikId);
                if (zakaznikId) { const zakaznik = zakaznici.find(z => z.id === parseInt(zakaznikId)); if (zakaznik) { setFormData({ ...formData, objednatel: zakaznik.nazev, zakaznikId: zakaznik.id }); saveNow?.(); } }
                else { setFormData({ ...formData, zakaznikId: undefined }); saveNow?.(); }
              }}>
                <option value="">-- Vyberte zákazníka --</option>
                {zakaznici.filter(z => z.id !== undefined).map(z => <option key={z.id} value={z.id!.toString()}>{z.nazev}{z.adresa ? ` (${z.adresa})` : ''}</option>)}
              </select>
            </Field>
          </div>
          {selectedZakaznikId && (() => {
            const zakaznik = zakaznici.find(z => z.id === parseInt(selectedZakaznikId));
            return zakaznik ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-[var(--text-muted)] bg-blue-50 rounded p-2">
                {zakaznik.adresa && <span>Adresa: {zakaznik.adresa}</span>}
                {zakaznik.ico && <span>IČO: {zakaznik.ico}</span>}
                {zakaznik.kontaktOsoba && <span>Kontakt: {zakaznik.kontaktOsoba}</span>}
                {zakaznik.telefon && <span>Tel: {zakaznik.telefon}</span>}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* ═══ 03 – CHARAKTERISTIKA LPS ═══ */}
      <div className={TW.card}>
        <SectionHeader num="03">Charakteristika systému ochrany před bleskem (LPS)</SectionHeader>
        <div className="p-4">
          <div className={TW.grid2}>
            <Field label="Třída LPS">
              <select className={TW.selectFull} value={formData.hromosvodTridaLps || ''} onChange={(e) => { setFormData({ ...formData, hromosvodTridaLps: e.target.value as any }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="I">I — Nejvyšší ochrana (výbušné prostory, nemocnice)</option>
                <option value="II">II — Vysoká ochrana (veřejné budovy)</option>
                <option value="III">III — Standardní ochrana (obytné budovy)</option>
                <option value="IV">IV — Základní ochrana</option>
              </select>
            </Field>
            <Field label="Typ ochrany">
              <select className={TW.selectFull} value={formData.hromosvodTypOchrany || ''} onChange={(e) => { setFormData({ ...formData, hromosvodTypOchrany: e.target.value as any }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="vnější">Vnější ochrana (jímače + svody + uzemnění)</option>
                <option value="vnitřní">Vnitřní ochrana (SPD + pospojování)</option>
                <option value="kombinovaná">Kombinovaná (vnější + vnitřní)</option>
              </select>
            </Field>
            <Field label="Rok instalace">
              <input type="text" className={TW.input} placeholder="např. 2005" value={formData.hromosvodRokInstalace || ''} onChange={(e) => setFormData({ ...formData, hromosvodRokInstalace: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Popis LPS">
              <textarea className={TW.textarea} rows={3} placeholder="Obecný popis systému ochrany před bleskem..." value={formData.hromosvodPopisLps || ''} onChange={(e) => setFormData({ ...formData, hromosvodPopisLps: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      {/* ═══ 04 – TERMÍNY ═══ */}
      <div className={TW.card}>
        <SectionHeader num="04">Termíny a data</SectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            <Field label="Datum revize">
              <input type="date" className={TW.input} value={formData.datum || ''} onChange={(e) => setFormData({ ...formData, datum: e.target.value })} />
            </Field>
            <Field label="Datum dokončení">
              <input type="date" className={TW.input} value={formData.datumDokonceni || ''} onChange={(e) => setFormData({ ...formData, datumDokonceni: e.target.value })} />
            </Field>
            <Field label="Datum vypracování">
              <input type="date" className={TW.input} value={formData.datumVypracovani || ''} onChange={(e) => setFormData({ ...formData, datumVypracovani: e.target.value })} />
            </Field>
            <Field label="Lhůta platnosti">
              <select className={TW.select} value={String(formData.termin || 48)} onChange={(e) => { setFormData({ ...formData, termin: parseInt(e.target.value) }); saveNow?.(); }}>
                <option value="12">1 rok</option>
                <option value="24">2 roky (LPS I/II - vizuální)</option>
                <option value="48">4 roky (LPS III/IV - vizuální)</option>
                <option value="60">5 let</option>
              </select>
            </Field>
            <Field label="Platnost do">
              <span className={`text-sm py-1 ${formData.datumPlatnosti ? 'font-medium' : 'text-[var(--text-secondary)]'}`}>
                {formData.datumPlatnosti ? new Date(formData.datumPlatnosti).toLocaleDateString('cs-CZ') : 'Vypočítá se při dokončení'}
              </span>
            </Field>
          </div>
        </div>
      </div>

      {/* ═══ 05 – STAV ═══ */}
      <div className={TW.card}>
        <SectionHeader num="05">Stav a výsledek revize</SectionHeader>
        <div className="p-4">
          <div className={TW.grid2}>
            <Field label="Stav">
              <select className={TW.select} value={formData.stav || ''} onChange={(e) => {
                const newStav = e.target.value;
                let newData: Partial<Revize> = { ...formData, stav: newStav as any };
                if (newStav === 'dokončeno' && revize.stav !== 'dokončeno') {
                  const today = new Date();
                  const platnostDo = new Date(today);
                  platnostDo.setMonth(platnostDo.getMonth() + (formData.termin || 36));
                  newData = { ...newData, datumPlatnosti: platnostDo.toISOString().split('T')[0], datumVypracovani: today.toISOString().split('T')[0] };
                }
                setFormData(newData);
                saveNow?.();
              }}>
                <option value="rozpracováno">Rozpracováno</option>
                <option value="dokončeno">Dokončeno</option>
                <option value="schváleno">Schváleno</option>
              </select>
            </Field>
            <Field label="Výsledek">
              <select className={TW.select} value={formData.vysledek || ''} onChange={(e) => { setFormData({ ...formData, vysledek: e.target.value as any }); saveNow?.(); }}>
                <option value="">-- Nevyplněno --</option>
                <option value="schopno">Schopno provozu</option>
                <option value="neschopno">Neschopno provozu</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* ═══ 06 – FIRMA ═══ */}
      <div className={TW.card}>
        <SectionHeader num="06">Firma provádějící revizi</SectionHeader>
        <div className="p-4 space-y-3">
          <Field label="Vybrat firmu">
            <select className={TW.selectFull} value={selectedFirmaId} onChange={(e) => {
              const firmaId = e.target.value;
              setSelectedFirmaId(firmaId);
              if (firmaId === '') { setFormData({ ...formData, firmaJmeno: '', firmaIco: '', firmaAdresa: '', firmaDic: '' }); saveNow?.(); }
              else { const firma = firmy.find(f => f.id?.toString() === firmaId); if (firma) { setFormData({ ...formData, firmaJmeno: firma.nazev, firmaIco: firma.ico || '', firmaAdresa: firma.adresa || '', firmaDic: firma.dic || '' }); saveNow?.(); } }
            }}>
              <option value="">Použít firmu z nastavení</option>
              {firmy.map(f => <option key={f.id} value={f.id!.toString()}>{f.nazev}</option>)}
            </select>
          </Field>
          <div className={TW.grid2}>
            <Field label="Název firmy">
              <input className={TW.input} placeholder="Ponechte prázdné → firma z nastavení" value={formData.firmaJmeno || ''} onChange={(e) => setFormData({ ...formData, firmaJmeno: e.target.value })} />
            </Field>
            <Field label="IČO">
              <input className={TW.input} value={formData.firmaIco || ''} onChange={(e) => setFormData({ ...formData, firmaIco: e.target.value })} />
            </Field>
            <Field label="Adresa">
              <input className={TW.input} value={formData.firmaAdresa || ''} onChange={(e) => setFormData({ ...formData, firmaAdresa: e.target.value })} />
            </Field>
            <Field label="DIČ">
              <input className={TW.input} value={formData.firmaDic || ''} onChange={(e) => setFormData({ ...formData, firmaDic: e.target.value })} />
            </Field>
          </div>
          {selectedFirmaId === '' && nastaveni && (nastaveni.firmaJmeno || nastaveni.firmaIco) && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">📋 Z nastavení: <strong>{nastaveni.firmaJmeno}</strong> | IČO: {nastaveni.firmaIco || '—'} | {nastaveni.firmaAdresa || '—'}</div>
          )}
          {selectedFirmaId === '' && (!nastaveni || (!nastaveni.firmaJmeno && !nastaveni.firmaIco)) && (
            <p className="text-xs text-amber-600">⚠️ Nemáte výchozí firmu. <Link to="/nastaveni" className="underline font-medium">Nastavení</Link></p>
          )}
        </div>
      </div>

    </div>
  );
}
