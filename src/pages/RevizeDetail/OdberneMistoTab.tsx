/**
 * OdberneMistoTab – formulář šablony "Odběrné místo (ČEZ)".
 * Data se ukládají do formData.odberneMistoData (JSON) a autosavem do DB.
 * Texty (rozsah, podklady, závěr, přístroje) se vyplňují v záložce "Revidované zařízení".
 */
import { Select } from '../../components/ui';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Revize } from '../../types';
import {
  createDefaultOdberneMisto, parseOdberneMisto, porovnejJistic, validujParametry, TARIFY_DISTRIBUCE,
  DEFAULT_CHECKLIST, PPNN_ZDROJ,
  type OdberneMistoData, type KontrolaPolozka, type MereniObvodu, type Vysledek,
} from '../../types/odberneMisto';
import { TW, SectionHeader, ToggleSectionHeader, Field } from './tw';
import { useNastaveni, useZakaznici } from '../../hooks/useQueries';
import { hodnotyCez, vychoziHodnotyCez, stahniPotvrzeniCez, type PoleCez } from '../../services/cezPotvrzeni';
import type { CezPotvrzeni } from '../../types/odberneMisto';

interface Props {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Revize>>>;
}

type ListKey = 'prohlidka' | 'zkouseni' | 'checklist';

function CB({ val, active, onClick }: { val: Vysledek; active: boolean; onClick: () => void }) {
  const base = 'flex-1 py-1 px-1 text-xs font-semibold border cursor-pointer text-center transition-all select-none rounded';
  const cls = active
    ? val === 'V' ? `${base} bg-[var(--success-bg)] border-[var(--success)] text-[var(--success-text)]`
    : val === 'N' ? `${base} bg-[var(--danger-bg)] border-[var(--danger)] text-[var(--danger-text)]`
    : `${base} bg-[var(--bg-hover-strong)] border-[var(--border-strong)] text-[var(--text)]`
    : `${base} border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]`;
  return <button className={cls} onClick={onClick} type="button">{val}</button>;
}

export function OdberneMistoTab({ revize, formData, setFormData }: Props) {
  const [fd, setFd] = useState<OdberneMistoData>(createDefaultOdberneMisto());
  const loadedForRef = useRef<number | undefined>(undefined);

  // Načtení uložených dat jen jednou pro danou revizi
  useEffect(() => {
    if (loadedForRef.current === revize.id) return;
    loadedForRef.current = revize.id;
    setFd(parseOdberneMisto(formData.odberneMistoData ?? revize.odberneMistoData));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revize.id]);

  // fd → rodičovský formData (autosave)
  useEffect(() => {
    setFormData(prev => {
      const json = JSON.stringify(fd);
      if (prev.odberneMistoData === json) return prev;
      return { ...prev, odberneMistoData: json };
    });
  }, [fd, setFormData]);

  const upd = useCallback(<K extends keyof OdberneMistoData>(key: K, value: OdberneMistoData[K]) => {
    setFd(prev => ({ ...prev, [key]: value }));
  }, []);

  const updCez = useCallback(<K extends keyof CezPotvrzeni>(key: K, value: CezPotvrzeni[K]) => {
    setFd(prev => ({ ...prev, cez: { ...prev.cez, [key]: value } }));
  }, []);

  // Formulář ČEZ: výchozí hodnoty z revize, zákazníka a nastavení (zobrazí se jako nápověda v polích)
  const { data: zakaznici = [] } = useZakaznici();
  const { data: nastaveni } = useNastaveni();
  const aktualniRevize = useMemo(() => ({ ...revize, ...formData }), [revize, formData]);
  const zakaznik = useMemo(
    () => zakaznici.find(z => z.id === (aktualniRevize.zakaznikId ?? undefined)) ?? null,
    [zakaznici, aktualniRevize.zakaznikId],
  );
  const cezVychozi = useMemo(
    () => vychoziHodnotyCez(aktualniRevize, fd, zakaznik, nastaveni),
    [aktualniRevize, fd, zakaznik, nastaveni],
  );
  const [cezStav, setCezStav] = useState<{ busy: boolean; chyba: string | null }>({ busy: false, chyba: null });
  const stahniCez = async () => {
    setCezStav({ busy: true, chyba: null });
    try {
      const { pole, faze } = hodnotyCez(aktualniRevize, fd, zakaznik, nastaveni);
      const razitko = fd.cez.vlozitRazitko ? nastaveni?.razitko : null;
      const nazev = `CEZ-potvrzeni-revize-${(aktualniRevize.cisloRevize || 'OM').replace(/[^\w-]+/g, '_')}.pdf`;
      await stahniPotvrzeniCez(pole, faze, nazev, razitko);
      setCezStav({ busy: false, chyba: null });
    } catch (e) {
      setCezStav({ busy: false, chyba: e instanceof Error ? e.message : 'Formulář se nepodařilo vytvořit.' });
    }
  };

  const updItem = useCallback((list: ListKey, idx: number, patch: Partial<KontrolaPolozka>) => {
    setFd(prev => {
      const arr = [...prev[list]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [list]: arr };
    });
  }, []);

  const toggleItem = (list: ListKey, idx: number, val: Vysledek, current: Vysledek) =>
    updItem(list, idx, { vysledek: current === val ? '' : val });

  const addItem = (list: ListKey) =>
    setFd(prev => ({ ...prev, [list]: [...prev[list], { nazev: '', norma: '', vysledek: '', poznamka: '', editable: true }] }));

  const removeItem = (list: ListKey, idx: number) =>
    setFd(prev => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }));

  const updMereni = (idx: number, patch: Partial<MereniObvodu>) =>
    setFd(prev => {
      const arr = [...prev.mereni];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, mereni: arr };
    });

  const tiskSekce: Record<string, boolean> = useMemo(() => {
    try { return formData.tiskSekce ? JSON.parse(formData.tiskSekce) : {}; } catch { return {}; }
  }, [formData.tiskSekce]);
  const isVisible = (key: string) => tiskSekce[key] !== false;
  const toggleSekce = (key: string) =>
    setFormData(prev => ({ ...prev, tiskSekce: JSON.stringify({ ...tiskSekce, [key]: !isVisible(key) }) }));

  const shoda = porovnejJistic(fd);
  const upozorneni = validujParametry(fd);

  const obnovitChecklist = () => {
    if (window.confirm('Nahradit celý kontrolní seznam výchozím seznamem dle Připojovacích podmínek nn? Vámi zadané výsledky a úpravy se přepíšou.')) {
      setFd(prev => ({ ...prev, checklist: DEFAULT_CHECKLIST.map(r => ({ ...r })) }));
    }
  };

  const inp = (key: keyof OdberneMistoData, label: string, opts?: { placeholder?: string; type?: string }) => (
    <Field label={label}>
      <input
        type={opts?.type || 'text'} className={TW.input} placeholder={opts?.placeholder}
        value={String(fd[key] ?? '')} onChange={e => upd(key, e.target.value as never)}
      />
    </Field>
  );

  /** Pole formuláře ČEZ – prázdné = použije se výchozí hodnota (zobrazená šedě). */
  const cezInp = (key: Exclude<keyof CezPotvrzeni, 'vlozitRazitko'> & PoleCez, label: string, opts?: { placeholder?: string; suffix?: string }) => (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          className={TW.input}
          value={fd.cez[key]}
          placeholder={cezVychozi[key] || opts?.placeholder || ''}
          onChange={e => updCez(key, e.target.value)}
        />
        {opts?.suffix && <span className="text-xs text-[var(--text-muted)]">{opts.suffix}</span>}
      </div>
    </Field>
  );

  const checklistCard = (
    list: ListKey, num: string, title: string, sekceKey: string, hint?: string,
  ) => (
    <div className={TW.card}>
      <ToggleSectionHeader num={num} visible={isVisible(sekceKey)} onToggle={() => toggleSekce(sekceKey)}>{title}</ToggleSectionHeader>
      <div className="p-4 space-y-2">
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
        <table className="w-full text-sm border-collapse">
          <thead><tr>
            <th className={TW.th}>Kontrolovaná položka</th>
            <th className={TW.th} style={{ width: '22%' }}>Norma / článek</th>
            <th className={TW.th} style={{ width: '17%' }}>Výsledek</th>
            <th className={TW.th} style={{ width: '18%' }}>Poznámka</th>
            <th className={TW.th} style={{ width: '4%' }} />
          </tr></thead>
          <tbody>
            {fd[list].map((r, i) => (
              <Fragment key={i}>
              {r.skupina && r.skupina !== fd[list][i - 1]?.skupina && (
                <tr><td colSpan={5} className="bg-[var(--section-header-bg)] text-xs font-bold uppercase tracking-wide text-[var(--text)] px-2 py-1">{r.skupina}</td></tr>
              )}
              <tr className="even:bg-[var(--bg-surface)]">
                <td className={TW.td}><input className={TW.tblInput} value={r.nazev} onChange={e => updItem(list, i, { nazev: e.target.value })} /></td>
                <td className={TW.td}><input className={TW.tblInput} value={r.norma || ''} onChange={e => updItem(list, i, { norma: e.target.value })} /></td>
                <td className={TW.td}><div className="flex gap-1">
                  {(['V', 'N', 'NA'] as Vysledek[]).map(v => (
                    <CB key={v} val={v} active={r.vysledek === v} onClick={() => toggleItem(list, i, v, r.vysledek)} />
                  ))}
                </div></td>
                <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updItem(list, i, { poznamka: e.target.value })} /></td>
                <td className={TW.td}>
                  <button type="button" className="text-[var(--text-muted)] hover:text-[var(--danger-text)] cursor-pointer" title="Odebrat řádek" onClick={() => removeItem(list, i)}>✕</button>
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-[var(--primary-text)] hover:underline cursor-pointer" onClick={() => addItem(list)}>+ Přidat řádek</button>
          {list === 'checklist' && (
            <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:underline cursor-pointer" onClick={obnovitChecklist}>↺ Obnovit výchozí seznam dle PPnn</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={TW.page}>

      {/* ═══ 01 – IDENTIFIKACE ODBĚRNÉHO MÍSTA ═══ */}
      <div className={TW.card}>
        <SectionHeader num="01">Identifikace odběrného místa</SectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            {inp('distributor', 'Distributor')}
            {inp('ean', 'EAN / OPM', { placeholder: '859182400…' })}
            {inp('cisloElektromeru', 'Číslo elektroměru')}
            {inp('parcela', 'Parcela / č.p. / k. ú.')}
            <Select label="Typ připojení" value={fd.typPripojeni} onChange={e => upd('typPripojeni', e.target.value as OdberneMistoData['typPripojeni'])} options={[{ value: "", label: "— vyberte —" }, { value: "kabel", label: "Kabelová přípojka" }, { value: "vzdusne", label: "Vzdušné vedení" }, { value: "jine", label: "Jiné" }]} />
            {inp('umisteniRozvadece', 'Umístění rozvaděče', { placeholder: 'např. fasáda objektu, pilíř na hranici pozemku' })}
          </div>
        </div>
      </div>

      {/* ═══ 02 – TECHNICKÉ PARAMETRY ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="02" visible={isVisible('parametry')} onToggle={() => toggleSekce('parametry')}>Technické parametry odběrného místa</ToggleSectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            {inp('soustava', 'Napájecí soustava', { placeholder: '3+PEN, 50 Hz, 230/400 V, TN-C' })}
            <Select label="Způsob měření" value={fd.zpusobMereni} onChange={e => upd('zpusobMereni', e.target.value as OdberneMistoData['zpusobMereni'])} options={[{ value: "", label: "— vyberte —" }, { value: "prime", label: "Přímé (do 80 A včetně)" }, { value: "neprime", label: "Nepřímé (přes transformátory proudu)" }]} />
            <Select label="Počet fází" value={fd.pocetFazi} onChange={e => upd('pocetFazi', e.target.value as OdberneMistoData['pocetFazi'])} options={[{ value: "", label: "— vyberte —" }, { value: "1", label: "1f" }, { value: "3", label: "3f" }]} />
            {inp('jisticTyp', 'Hlavní jistič – typ / výrobce')}
            {inp('jisticProud', 'Hlavní jistič – osazeno (A)')}
            {inp('jisticCharakteristika', 'Charakteristika', { placeholder: 'B / C / E' })}
            <Select label="Plombovatelnost" value={fd.plombovani} onChange={e => upd('plombovani', e.target.value as OdberneMistoData['plombovani'])} options={[{ value: "", label: "— vyberte —" }, { value: "ano", label: "Ano" }, { value: "ne", label: "Ne" }]} />
            {inp('rozvadecVyrobce', 'Rozvaděč – výrobce')}
            {inp('rozvadecTyp', 'Rozvaděč – typ')}
            {inp('rozvadecIp', 'Stupeň krytí IP')}
            {inp('rozvadecTrida', 'Třída ochrany')}
            {inp('rozvadecProhlaseni', 'Prohlášení o shodě', { placeholder: 'např. EU PROHLÁŠENÍ O SHODĚ 2023-06' })}
            {inp('jisticZkratovaSchopnost', 'Zkratová schopnost jističe (kA)', { placeholder: 'min. 10' })}
            <Select label="Prostředí rozváděče" value={fd.umisteniProstredi} onChange={e => upd('umisteniProstredi', e.target.value as OdberneMistoData['umisteniProstredi'])} options={[{ value: "", label: "— vyberte —" }, { value: "vnitrni", label: "Vnitřní (min. IP 2XC)" }, { value: "venkovni", label: "Venkovní (min. IP 43)" }, { value: "venkovniKomunikace", label: "Venkovní u komunikace (min. IP 44)" }]} />
          </div>
          {upozorneni.length > 0 && (
            <div className="mt-3 rounded border border-[var(--warning)]/40 bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)] space-y-0.5">
              <div className="font-semibold">Nesoulad s Připojovacími podmínkami nn:</div>
              {upozorneni.map((u, i) => <div key={i}>⚠ {u}</div>)}
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--text-muted)]">Kontroly vycházejí z dokumentu: {PPNN_ZDROJ}.</p>
        </div>
      </div>

      {/* ═══ 03 – SMLOUVA A TARIF ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="03" visible={isVisible('smlouva')} onToggle={() => toggleSekce('smlouva')}>Smlouva o připojení a tarif odběru</ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid3}>
            {inp('smlouvaCislo', 'Číslo smlouvy')}
            {inp('smlouvaDatum', 'Datum uzavření', { type: 'date' })}
            {inp('smlouvaPlatnost', 'Platnost do / prodloužení', { type: 'date' })}
            <Select label="Typ odběru" value={fd.smlouvaTypOdberu} onChange={e => upd('smlouvaTypOdberu', e.target.value as OdberneMistoData['smlouvaTypOdberu'])} options={[{ value: "", label: "— vyberte —" }, { value: "novy", label: "Nový odběr" }, { value: "zmena", label: "Změna odběru" }, { value: "rozsireni", label: "Rozšíření odběru" }]} />
            {inp('smlouvaUcel', 'Účel odběru', { placeholder: 'domácnost / podnikání / FVE…' })}
            {inp('smlouvaPrikon', 'Rezervovaný příkon dle smlouvy (kW)')}
            {inp('smlouvaJistic', 'Hlavní jistič dle smlouvy (A)')}
            <Field label="Distribuční sazba (tarif)">
              <input className={TW.input} list="odberne-misto-tarify" value={fd.tarif} onChange={e => upd('tarif', e.target.value)} placeholder="např. D02d" />
              <datalist id="odberne-misto-tarify">{TARIFY_DISTRIBUCE.map(t => <option key={t} value={t} />)}</datalist>
            </Field>
            {inp('hdoKod', 'HDO – kód / signál')}
          </div>
          <div className={`text-xs rounded px-3 py-2 border ${
            shoda === 'shoda' ? 'bg-[var(--success-bg)] border-[var(--success)] text-[var(--success-text)]'
            : shoda === 'neshoda' ? 'bg-[var(--danger-bg)] border-[var(--danger)]/50 text-[var(--danger-text)]'
            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'}`}>
            {shoda === 'shoda' && `✓ Osazený hlavní jistič (${fd.jisticProud} A) odpovídá smlouvě.`}
            {shoda === 'neshoda' && `⚠ Osazený hlavní jistič (${fd.jisticProud} A) NEODPOVÍDÁ smlouvě (${fd.smlouvaJistic} A). Uveďte v závěru.`}
            {shoda === 'neurceno' && 'Vyplňte osazený jistič a jistič dle smlouvy pro automatické porovnání.'}
          </div>
          <Field label="Poznámka ke smlouvě / tarifu">
            <textarea className={TW.textarea} rows={2} value={fd.smlouvaPoznamka} onChange={e => upd('smlouvaPoznamka', e.target.value)} />
          </Field>
        </div>
      </div>

      {checklistCard('prohlidka', '04', 'Prohlídka', 'prohlidka')}
      {checklistCard('zkouseni', '05', 'Zkoušení', 'zkouseni')}

      {/* ═══ 06 – MĚŘENÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="06" visible={isVisible('mereni')} onToggle={() => toggleSekce('mereni')}>Měření</ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            {inp('napetiU0', 'Měřené napětí U0 (V)')}
            {inp('prechodovyOdpor', 'Max. přechodový odpor (Ω)', { placeholder: 'nepřekročeno 0,1' })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr>
                {['Obvod', 'Jištění', 'Kabel', 'Zs (Ω)', 'U (V)', 'I (A)', 'ta (ms)', 'IΔn (mA)', 'Riz (MΩ)', 'Výsledek', ''].map(h => <th key={h} className={TW.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {fd.mereni.map((m, i) => (
                  <tr key={i} className="even:bg-[var(--bg-surface)]">
                    {(['oznaceni', 'jisteni', 'typKabelu', 'zs', 'u', 'i', 'ta', 'idn', 'riz'] as const).map(f => (
                      <td key={f} className={TW.td}><input className={TW.tblInput} value={m[f]} onChange={e => updMereni(i, { [f]: e.target.value })} /></td>
                    ))}
                    <td className={TW.td}><div className="flex gap-1">
                      {(['V', 'N'] as Vysledek[]).map(v => (
                        <CB key={v} val={v} active={m.vysledek === v} onClick={() => updMereni(i, { vysledek: m.vysledek === v ? '' : v })} />
                      ))}
                    </div></td>
                    <td className={TW.td}>
                      <button type="button" className="text-[var(--text-muted)] hover:text-[var(--danger-text)] cursor-pointer" title="Odebrat řádek"
                        onClick={() => setFd(prev => ({ ...prev, mereni: prev.mereni.filter((_, j) => j !== i) }))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="text-xs text-[var(--primary-text)] hover:underline cursor-pointer"
            onClick={() => setFd(prev => ({ ...prev, mereni: [...prev.mereni, { oznaceni: '', jisteni: '', typKabelu: '', zs: '', u: '', i: '', ta: '', idn: '', riz: '', vysledek: '' }] }))}>
            + Přidat obvod
          </button>
        </div>
      </div>

      {checklistCard(
        'checklist', '07', 'Kontrolní seznam dle připojovacích podmínek distributora', 'checklist',
        `Seznam vychází z dokumentu: ${PPNN_ZDROJ}. Položky lze upravit, přidat nebo smazat.`,
      )}

      {/* ═══ 08 – POTVRZENÍ PRO ČEZ DISTRIBUCE ═══ */}
      <div className={TW.card}>
        <SectionHeader num="08">Potvrzení o vydání zprávy o revizi (formulář ČEZ Distribuce)</SectionHeader>
        <div className="p-4 space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            Vyplní originální formulář distributora. Šedé hodnoty v polích se doplní automaticky z revize, zákazníka
            a nastavení – přepište je jen v případě potřeby. EAN, číslo parcely, hodnota jističe a počet fází se berou
            z oddílů 01 a 02, údaje revizního technika z Nastavení.
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-2">Zákazník</h4>
            <div className={TW.grid2}>
              {cezInp('zakaznikJmeno', 'Jméno a příjmení, titul / obchodní firma / název')}
              {cezInp('zakaznikIco', 'Datum narození / IČO')}
              {cezInp('zakaznikDic', 'DIČ CZ')}
              {cezInp('zakaznikMobil', 'Mobil')}
              {cezInp('zakaznikEmail', 'E-mail')}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-2">Odběrné místo</h4>
            <div className={TW.grid2}>
              {cezInp('cisloOm', 'Číslo OM')}
              {cezInp('ulice', 'Ulice')}
              {cezInp('cisloDomu', 'Č. p. / č. o.')}
              {cezInp('psc', 'PSČ')}
              {cezInp('obec', 'Obec')}
              {cezInp('mistniCast', 'Místní část')}
              {cezInp('katastr', 'Katastrální území (u novostavby)')}
              {cezInp('patro', 'Patro')}
              {cezInp('cisloBytu', 'Číslo bytu')}
              {cezInp('upresneni', 'Upřesnění místa odběru')}
              {cezInp('prevodMtp', 'Převod MTP (jsou-li instalovány)', { placeholder: 'např. 150/5', suffix: 'A' })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-2">Příkon spotřebičů pro dvoutarifovou sazbu</h4>
            <div className={TW.grid2}>
              {cezInp('tuvKw', 'Ohřev vody (TUV) – akumulační', { suffix: 'kW' })}
              {cezInp('tcPohonKw', 'Tepelné čerpadlo – příkon pohonu', { suffix: 'kW' })}
              {cezInp('akuKw', 'Akumulační topení', { suffix: 'kW' })}
              {cezInp('tcDotopKw', 'Tepelné čerpadlo – dotop', { suffix: 'kW' })}
              {cezInp('primotopKw', 'Přímotopné topení', { suffix: 'kW' })}
              {cezInp('tcVykonKw', 'Tepelné čerpadlo – topný výkon', { suffix: 'kW' })}
              {cezInp('jineNazev', 'Jiné (uveďte)')}
              {cezInp('jineKw', 'Jiné – příkon', { suffix: 'kW' })}
            </div>
          </div>

          <div className="text-xs text-[var(--text-secondary)] rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3 py-2 space-y-0.5">
            <div><span className="font-semibold">Revizní technik:</span> {cezVychozi.technikJmeno || '—'}{cezVychozi.technikOsvedceni ? `, osvědčení ${cezVychozi.technikOsvedceni}` : ''}</div>
            <div>
              Zpráva č. {cezVychozi.cisloZpravy || '—'} vypracovaná {cezVychozi.vypracovano || '—'}
              {cezVychozi.technikMobil ? ` · ${cezVychozi.technikMobil}` : ''}{cezVychozi.technikEmail ? ` · ${cezVychozi.technikEmail}` : ''}
              {cezVychozi.technikIco ? ` · IČO ${cezVychozi.technikIco}` : ''}
            </div>
            {(!cezVychozi.technikJmeno || !cezVychozi.technikOsvedceni) && (
              <div className="text-[var(--warning-text)]">Doplňte jméno a evidenční číslo osvědčení revizního technika v Nastavení.</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={stahniCez}
              disabled={cezStav.busy}
              className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-[var(--radius-md)] text-sm font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] disabled:opacity-50"
            >
              {cezStav.busy ? 'Vytvářím…' : '⬇ Stáhnout formulář ČEZ (PDF)'}
            </button>
            {nastaveni?.razitko && (
              <label className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={fd.cez.vlozitRazitko} onChange={e => updCez('vlozitRazitko', e.target.checked)} />
                Vložit razítko z Nastavení
              </label>
            )}
            {cezStav.chyba && <span role="alert" className="text-sm text-[var(--danger-text)]">{cezStav.chyba}</span>}
          </div>
          {!fd.pocetFazi && <p className="text-xs text-[var(--warning-text)]">Není vybrán počet fází (oddíl 02) – ve formuláři zůstane 1f/3f nezaškrtnuté.</p>}
        </div>
      </div>
    </div>
  );
}
