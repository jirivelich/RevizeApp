/**
 * StrojniZarizeniTab – Formulář protokolu ověření strojního zařízení
 * Integrovaný přímo v RevizeDetailPage jako tab pro kategorii 'stroje'.
 * 
 * Design: Tailwind CSS, sjednoceno s ostatními taby (slate paleta, bg-slate-800 sekční hlavičky)
 * Data se ukládají do DB přes rodičovský formData + export do PDF / Excel
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Revize, Nastaveni, Zakaznik, MericiPristroj } from '../../types';
import { Modal } from '../../components/ui';
import { useAddPristrojToRevize, useRemovePristrojFromRevize } from '../../hooks/useQueries';
import { TW } from './tw';

// Typy
interface JisteniRow { nazev: string; typ: string; hodnota: string; charakteristika: string; stav: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface IzolaceRow { misto: string; napeti: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface SpojitostRow { misto: string; proud: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface ImpedanceRow { misto: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface RcdRow { nazev: string; idn: string; typ: string; cas: string; limit: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface KontrolaRow { nazev: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; editable: boolean; }
interface PristrojRow { typ: string; sn: string; kalibrace: string; trida: string; poznamka: string; }

interface StrojniFormData {
  strojNazev: string; strojSn: string; strojVyrobce: string; strojRok: string;
  strojNapajeni: string; strojPrikon: string; strojProud: string; strojIp: string;
  strojTrida: string; strojCe: string; mistoHala: string;
  strojPrivod: '' | 'pevny' | 'pohyblivy';
  jisteni: JisteniRow[]; izolace: IzolaceRow[]; spojitost: SpojitostRow[];
  impedance: ImpedanceRow[]; rcd: RcdRow[]; kontroly: KontrolaRow[]; pristroje: PristrojRow[];
  verdikt: '' | 'pass' | 'fail';
  posudekZavady: string; posudekDoporuceni: string; posudekNormy: string;
}

// Výchozí data
const DEFAULT_JISTENI: JisteniRow[] = [
  { nazev: 'Hlavní jistič', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Motorový spouštěč', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Proudový chránič (RCD)', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Přepěťová ochrana (SPD)', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: '', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
];
const DEFAULT_IZOLACE: IzolaceRow[] = [
  { misto: 'L1, L2, L3 → PE (napájení)', napeti: '500 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Řídicí obvody → PE', napeti: '250 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Bezpečnostní obvody → PE', napeti: '250 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Topné obvody → PE', napeti: '500 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: '', napeti: '', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
];
const DEFAULT_SPOJITOST: SpojitostRow[] = [
  { misto: 'Rozvaděč → kostra stroje', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: 'Kostra → pohyblivé části', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: 'Kostra → kryt motoru', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: '', proud: '', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
];
const DEFAULT_IMPEDANCE: ImpedanceRow[] = [
  { misto: 'Napájecí přívod L1-PE', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
  { misto: 'Napájecí přívod L2-PE', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
  { misto: 'Napájecí přívod L3-PE', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
  { misto: '', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
];
const DEFAULT_RCD: RcdRow[] = [
  { nazev: 'RCD 1', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
  { nazev: 'RCD 2', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
  { nazev: 'RCD 3', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
];
const KONTROLY_LABELS = [
  'STOP tlačítko – nouzové zastavení (Emergency Stop)',
  'STOP tlačítko – provozní zastavení',
  'START tlačítko – funkce a označení',
  'Bezpečnostní relé / modul',
  'Bezpečnostní kryt / dveřní spínač (interlocking)',
  'Světelná závora / bezpečnostní mat',
  'Ovládací panel – označení a čitelnost prvků',
  'Signalizace provozních stavů (indikátory)',
  'Nouzové osvětlení (pokud je součástí stroje)',
  'Uzemňovací svorka stroje – přítomnost a stav',
  'Označení vodičů a svorek',
  'Stav kabelových průchodek a vývodnic',
  'Krytí rozvaděče / el. zařízení (IP)',
  'Jiné:',
];
const DEFAULT_KONTROLY: KontrolaRow[] = KONTROLY_LABELS.map((l, i) => ({
  nazev: l, vysledek: '' as const, poznamka: '', editable: i === KONTROLY_LABELS.length - 1,
}));
const DEFAULT_PRISTROJE: PristrojRow[] = [
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
];

function createDefault(): StrojniFormData {
  return {
    strojNazev: '', strojSn: '', strojVyrobce: '', strojRok: '',
    strojNapajeni: '', strojPrikon: '', strojProud: '', strojIp: '',
    strojTrida: '', strojCe: '', mistoHala: '', strojPrivod: '',
    jisteni: DEFAULT_JISTENI.map(r => ({ ...r })),
    izolace: DEFAULT_IZOLACE.map(r => ({ ...r })),
    spojitost: DEFAULT_SPOJITOST.map(r => ({ ...r })),
    impedance: DEFAULT_IMPEDANCE.map(r => ({ ...r })),
    rcd: DEFAULT_RCD.map(r => ({ ...r })),
    kontroly: DEFAULT_KONTROLY.map(r => ({ ...r })),
    pristroje: DEFAULT_PRISTROJE.map(r => ({ ...r })),
    verdikt: '', posudekZavady: '', posudekDoporuceni: '',
    posudekNormy: 'ČSN EN 60204-1, zákon č. 250/2021 Sb.',

  };
}

// ── Props ──
interface StrojniZarizeniTabProps {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznici: Zakaznik[];
  pouzitePristroje: MericiPristroj[];
  vsechnyPristroje: MericiPristroj[];
  revizeId: number;
  formData: Partial<Revize>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Revize>>>;
}

// ── Check button ──
function CB({ val, active, label, onClick }: { val: string; active: boolean; label: string; onClick: () => void }) {
  const base = 'flex-1 py-1 px-1 text-xs font-semibold border cursor-pointer text-center transition-all select-none rounded';
  const cls = active
    ? val === 'V' ? `${base} bg-emerald-50 border-emerald-500 text-emerald-600`
    : val === 'N' ? `${base} bg-red-50 border-red-500 text-red-600`
    : `${base} bg-slate-100 border-slate-400 text-[var(--text-muted)]`
    : `${base} border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]`;
  return <button className={cls} onClick={onClick} type="button">{label}</button>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function StrojniZarizeniTab({ revize, nastaveni, zakaznici, pouzitePristroje, vsechnyPristroje, revizeId, formData, setFormData }: StrojniZarizeniTabProps) {
  const [fd, setFd] = useState<StrojniFormData>(createDefault());
  const loadedRef = useRef(false);
  const [isPristrojModalOpen, setIsPristrojModalOpen] = useState(false);
  const addPristroj = useAddPristrojToRevize();
  const removePristroj = useRemovePristrojFromRevize();

  // Stabilní reference na přístroje (zabrání nekonečnému loop)
  const pristrojeJson = JSON.stringify(
    pouzitePristroje.map(p => ({ v: p.vyrobce, m: p.model, sn: p.vyrobniCislo, k: p.platnostKalibrace, p: p.poznamka }))
  );

  // Načtení dat – běží jen jednou nebo při změně revize
  useEffect(() => {
    if (loadedRef.current && revize.id) return;
    loadedRef.current = true;

    const d = createDefault();

    // Předvyplnit z revize
    d.mistoHala = '';

    // Předvyplnit přístroje
    if (pouzitePristroje.length > 0) {
      d.pristroje = pouzitePristroje.map(p => ({
        typ: `${p.vyrobce} ${p.model}`.trim(),
        sn: p.vyrobniCislo || '',
        kalibrace: p.platnostKalibrace || '',
        trida: '',
        poznamka: p.poznamka || '',
      }));
      while (d.pristroje.length < 3) d.pristroje.push({ typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' });
    }

    // Načíst uložená data z DB (strojniData JSON)
    const strojniJson = revize.strojniData || formData.strojniData;
    if (strojniJson) {
      try { Object.assign(d, JSON.parse(strojniJson)); } catch { /* ignore */ }
    }

    setFd(d);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revize.id, pristrojeJson]);

  // Synchronizovat fd → rodičovský formData.strojniData (efekt běží PO renderu → žádný warning)
  useEffect(() => {
    setFormData(prev => {
      const json = JSON.stringify(fd);
      if (prev.strojniData === json) return prev;
      return { ...prev, strojniData: json };
    });
  }, [fd, setFormData]);

  const upd = useCallback(<K extends keyof StrojniFormData>(key: K, value: StrojniFormData[K]) => {
    setFd(prev => ({ ...prev, [key]: value }));
  }, []);

  const updRow = useCallback((tableKey: keyof StrojniFormData, idx: number, field: string, value: string) => {
    setFd(prev => {
      const t = [...(prev[tableKey] as unknown[])];
      t[idx] = { ...(t[idx] as Record<string, unknown>), [field]: value };
      return { ...prev, [tableKey]: t } as StrojniFormData;
    });
  }, []);

  const toggleCheck = useCallback((tableKey: keyof StrojniFormData, idx: number, field: string, val: string) => {
    setFd(prev => {
      const t = [...(prev[tableKey] as unknown[])];
      const row = t[idx] as Record<string, unknown>;
      t[idx] = { ...row, [field]: row[field] === val ? '' : val };
      return { ...prev, [tableKey]: t } as StrojniFormData;
    });
  }, []);

  // Export handler – Excel only (PDF is via PrintReport page)
  const handleExcel = async () => {
    const { exportStrojniExcel } = await import('../StrojniZarizeniPrint/excelExport');
    const fullData = buildExportData();
    await exportStrojniExcel(fullData);
  };

  // Sestavit kompletní data pro export (doplnit z revize a nastavení)
  function buildExportData() {
    const zakaznik = zakaznici.find(z => z.id === revize.zakaznikId);
    return {
      cisloProtokolu: revize.cisloRevize || '',
      rtJmeno: nastaveni?.reviznniTechnikJmeno || '',
      rtOpravneni: nastaveni?.reviznniTechnikCisloOpravneni || '',
      rtOsvedceni: nastaveni?.reviznniTechnikOsvedceni || '',
      rtAdresa: [nastaveni?.firmaAdresa, nastaveni?.firmaIco ? `IČO: ${nastaveni.firmaIco}` : ''].filter(Boolean).join(', '),
      rtTel: nastaveni?.kontaktTelefon || '',
      rtEmail: nastaveni?.kontaktEmail || '',
      objNazev: zakaznik?.nazev || revize.objednatel || '',
      objIco: zakaznik?.ico || '',
      objAdresa: zakaznik?.adresa || revize.adresa || '',
      objKontakt: zakaznik?.kontaktOsoba || '',
      objTel: [zakaznik?.telefon, zakaznik?.email].filter(Boolean).join(' / '),
      mistoAdresa: revize.adresa || '',
      mistoDatum: revize.datum || '',
      mistoZakazka: revize.cisloRevize || '',
      ...fd,
    };
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">

      {/* Export bar */}
      <div className="flex gap-2 justify-end py-2">
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg text-white cursor-pointer transition-all hover:-translate-y-0.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleExcel} type="button">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l6-6M9 9l6 6"/></svg>
          Excel
        </button>
      </div>

      {/* ═══ 01 – IDENTIFIKACE STROJE ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">01</span> Identifikace strojního zařízení – štítek
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-2.5">
            <div className="flex flex-col gap-1 col-span-2 max-sm:col-span-1"><label className={TW.label}>Název / typ stroje</label>
              <input type="text" className={TW.input} value={fd.strojNazev} onChange={e => upd('strojNazev', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Výrobní číslo (SN)</label>
              <input type="text" className={TW.input} value={fd.strojSn} onChange={e => upd('strojSn', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Výrobce</label>
              <input type="text" className={TW.input} value={fd.strojVyrobce} onChange={e => upd('strojVyrobce', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Rok výroby</label>
              <input type="text" className={TW.input} value={fd.strojRok} onChange={e => upd('strojRok', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Napájení (V / Hz)</label>
              <input type="text" className={TW.input} value={fd.strojNapajeni} onChange={e => upd('strojNapajeni', e.target.value)} placeholder="3×400V / 50Hz" /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Příkon (kW)</label>
              <input type="text" className={TW.input} value={fd.strojPrikon} onChange={e => upd('strojPrikon', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Jmenovitý proud (A)</label>
              <input type="text" className={TW.input} value={fd.strojProud} onChange={e => upd('strojProud', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Stupeň ochrany IP</label>
              <input type="text" className={TW.input} value={fd.strojIp} onChange={e => upd('strojIp', e.target.value)} placeholder="IP54" /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Třída ochrany</label>
              <select className={TW.input} value={fd.strojTrida} onChange={e => upd('strojTrida', e.target.value)}>
                <option value="">— vyberte —</option>
                <option>I (ochranné uzemnění)</option>
                <option>II (dvojitá izolace)</option>
                <option>III (SELV)</option>
              </select></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>CE / Prohlášení o shodě</label>
              <select className={TW.input} value={fd.strojCe} onChange={e => upd('strojCe', e.target.value)}>
                <option value="">— vyberte —</option>
                <option>Ano</option><option>Ne</option><option>Nelze ověřit</option>
              </select></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Hala / pracoviště</label>
              <input type="text" className={TW.input} value={fd.mistoHala} onChange={e => upd('mistoHala', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Připojení stroje</label>
              <select className={TW.input} value={fd.strojPrivod} onChange={e => upd('strojPrivod', e.target.value as '' | 'pevny' | 'pohyblivy')}>
                <option value="">— vyberte —</option>
                <option value="pevny">Pevný přívod</option>
                <option value="pohyblivy">Pohyblivý přívod</option>
              </select></div>
          </div>
        </div>
      </div>

      {/* ═══ 02 – JIŠTĚNÍ ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">02</span> Jištění strojního zařízení
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '24%' }}>Prvek jištění</th>
              <th className={TW.th} style={{ width: '22%' }}>Typ / označení</th>
              <th className={TW.th} style={{ width: '16%' }}>Jmenovitá hodnota</th>
              <th className={TW.th} style={{ width: '18%' }}>Charakteristika</th>
              <th className={TW.th} style={{ width: '12%' }}>Stav</th>
              <th className={TW.th} style={{ width: '8%' }}>Pozn.</th>
            </tr></thead>
            <tbody>
              {fd.jisteni.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.nazev} onChange={e => updRow('jisteni', i, 'nazev', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.typ} onChange={e => updRow('jisteni', i, 'typ', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.hodnota} onChange={e => updRow('jisteni', i, 'hodnota', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.charakteristika} onChange={e => updRow('jisteni', i, 'charakteristika', e.target.value)} /></td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="V" active={r.stav==='V'} onClick={() => toggleCheck('jisteni',i,'stav','V')} />
                    <CB val="N" label="N" active={r.stav==='N'} onClick={() => toggleCheck('jisteni',i,'stav','N')} />
                    <CB val="NA" label="NA" active={r.stav==='NA'} onClick={() => toggleCheck('jisteni',i,'stav','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('jisteni', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 03 – IZOLAČNÍ ODPOR ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">03</span> Měření izolačního odporu (ČSN EN 60204-1)
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '32%' }}>Měřené místo / obvod</th>
              <th className={TW.th} style={{ width: '15%' }}>Zkušební napětí (V)</th>
              <th className={TW.th} style={{ width: '18%' }}>Naměřená hodnota (MΩ)</th>
              <th className={TW.th} style={{ width: '15%' }}>Požadavek (min.)</th>
              <th className={TW.th} style={{ width: '12%' }}>Výsledek</th>
              <th className={TW.th} style={{ width: '8%' }}>Pozn.</th>
            </tr></thead>
            <tbody>
              {fd.izolace.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.misto} onChange={e => updRow('izolace', i, 'misto', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.napeti} onChange={e => updRow('izolace', i, 'napeti', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.hodnota} onChange={e => updRow('izolace', i, 'hodnota', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.pozadavek} onChange={e => updRow('izolace', i, 'pozadavek', e.target.value)} /></td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="V" active={r.vysledek==='V'} onClick={() => toggleCheck('izolace',i,'vysledek','V')} />
                    <CB val="N" label="N" active={r.vysledek==='N'} onClick={() => toggleCheck('izolace',i,'vysledek','N')} />
                    <CB val="NA" label="NA" active={r.vysledek==='NA'} onClick={() => toggleCheck('izolace',i,'vysledek','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('izolace', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-secondary)] italic mt-1.5">V = Vyhovuje &nbsp;|&nbsp; N = Nevyhovuje &nbsp;|&nbsp; NA = Neaplikováno</p>
        </div>
      </div>

      {/* ═══ 04 – SPOJITOST PE ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">04</span> Měření spojitosti ochranných vodičů (PE)
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '32%' }}>Měřené místo</th>
              <th className={TW.th} style={{ width: '16%' }}>Proud zkoušky (A)</th>
              <th className={TW.th} style={{ width: '18%' }}>Naměřený odpor (Ω)</th>
              <th className={TW.th} style={{ width: '15%' }}>Požadavek</th>
              <th className={TW.th} style={{ width: '12%' }}>Výsledek</th>
              <th className={TW.th} style={{ width: '7%' }}>Pozn.</th>
            </tr></thead>
            <tbody>
              {fd.spojitost.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.misto} onChange={e => updRow('spojitost', i, 'misto', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.proud} onChange={e => updRow('spojitost', i, 'proud', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.hodnota} onChange={e => updRow('spojitost', i, 'hodnota', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.pozadavek} onChange={e => updRow('spojitost', i, 'pozadavek', e.target.value)} /></td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="V" active={r.vysledek==='V'} onClick={() => toggleCheck('spojitost',i,'vysledek','V')} />
                    <CB val="N" label="N" active={r.vysledek==='N'} onClick={() => toggleCheck('spojitost',i,'vysledek','N')} />
                    <CB val="NA" label="NA" active={r.vysledek==='NA'} onClick={() => toggleCheck('spojitost',i,'vysledek','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('spojitost', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-secondary)] italic mt-1.5">V = Vyhovuje &nbsp;|&nbsp; N = Nevyhovuje &nbsp;|&nbsp; NA = Neaplikováno</p>
        </div>
      </div>

      {/* ═══ 05 – IMPEDANCE PORUCHOVÉ SMYČKY ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">05</span> Měření impedance poruchové smyčky
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '32%' }}>Měřené místo</th>
              <th className={TW.th} style={{ width: '18%' }}>Naměřeno (Ω)</th>
              <th className={TW.th} style={{ width: '18%' }}>Požadavek (max.)</th>
              <th className={TW.th} style={{ width: '12%' }}>Výsledek</th>
              <th className={TW.th} style={{ width: '20%' }}>Pozn.</th>
            </tr></thead>
            <tbody>
              {fd.impedance.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.misto} onChange={e => updRow('impedance', i, 'misto', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.hodnota} onChange={e => updRow('impedance', i, 'hodnota', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.pozadavek} onChange={e => updRow('impedance', i, 'pozadavek', e.target.value)} /></td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="V" active={r.vysledek==='V'} onClick={() => toggleCheck('impedance',i,'vysledek','V')} />
                    <CB val="N" label="N" active={r.vysledek==='N'} onClick={() => toggleCheck('impedance',i,'vysledek','N')} />
                    <CB val="NA" label="NA" active={r.vysledek==='NA'} onClick={() => toggleCheck('impedance',i,'vysledek','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('impedance', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-secondary)] italic mt-1.5">V = Vyhovuje &nbsp;|&nbsp; N = Nevyhovuje &nbsp;|&nbsp; NA = Neaplikováno</p>
        </div>
      </div>

      {/* ═══ 06 – RCD ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">06</span> Měření proudových chráničů (RCD)
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th}>Označení RCD</th><th className={TW.th}>IΔn (mA)</th><th className={TW.th}>Typ (AC/A/B)</th>
              <th className={TW.th}>Čas vybavení (ms)</th><th className={TW.th}>Limit (ms)</th><th className={TW.th}>Výsledek</th><th className={TW.th}>Pozn.</th>
            </tr></thead>
            <tbody>
              {fd.rcd.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.nazev} onChange={e => updRow('rcd', i, 'nazev', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.idn} onChange={e => updRow('rcd', i, 'idn', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.typ} onChange={e => updRow('rcd', i, 'typ', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.cas} onChange={e => updRow('rcd', i, 'cas', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.limit} onChange={e => updRow('rcd', i, 'limit', e.target.value)} /></td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="V" active={r.vysledek==='V'} onClick={() => toggleCheck('rcd',i,'vysledek','V')} />
                    <CB val="N" label="N" active={r.vysledek==='N'} onClick={() => toggleCheck('rcd',i,'vysledek','N')} />
                    <CB val="NA" label="NA" active={r.vysledek==='NA'} onClick={() => toggleCheck('rcd',i,'vysledek','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('rcd', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-secondary)] italic mt-1.5">V = Vyhovuje &nbsp;|&nbsp; N = Nevyhovuje &nbsp;|&nbsp; NA = Neaplikováno</p>
        </div>
      </div>

      {/* ═══ 07 – FUNKČNÍ KONTROLY ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">07</span> Funkční kontroly
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '40%' }}>Kontrolovaný prvek</th>
              <th className={TW.th} style={{ width: '30%' }}>Výsledek</th>
              <th className={TW.th}>Poznámka</th>
            </tr></thead>
            <tbody>
              {fd.kontroly.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}>{r.editable
                    ? <input className={TW.tblInput} value={r.nazev} onChange={e => updRow('kontroly', i, 'nazev', e.target.value)} />
                    : <span className="text-sm text-slate-700">{r.nazev}</span>
                  }</td>
                  <td className={TW.td}><div className="flex gap-1.5">
                    <CB val="V" label="Vyhovuje" active={r.vysledek==='V'} onClick={() => toggleCheck('kontroly',i,'vysledek','V')} />
                    <CB val="N" label="Nevyhovuje" active={r.vysledek==='N'} onClick={() => toggleCheck('kontroly',i,'vysledek','N')} />
                    <CB val="NA" label="N/A" active={r.vysledek==='NA'} onClick={() => toggleCheck('kontroly',i,'vysledek','NA')} />
                  </div></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('kontroly', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 08 – MĚŘICÍ PŘÍSTROJE ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">08</span> Použité měřicí přístroje
          <button
            type="button"
            onClick={() => setIsPristrojModalOpen(true)}
            className="ml-auto px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-600 text-white rounded cursor-pointer hover:bg-emerald-700 transition-colors"
          >
            + Přidat z databáze
          </button>
        </div>
        <div className="p-4">
          {/* Přiřazené přístroje z DB */}
          {pouzitePristroje.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Přiřazené přístroje (z databáze)</div>
              <table className="w-full text-sm border-collapse mt-1">
                <thead><tr>
                  <th className={TW.th}>Název</th>
                  <th className={TW.th}>Výrobce / Model</th>
                  <th className={TW.th}>Výrobní číslo</th>
                  <th className={TW.th}>Kalibrace do</th>
                  <th className={TW.th} style={{ width: 50 }}>Akce</th>
                </tr></thead>
                <tbody>
                  {pouzitePristroje.map(p => (
                    <tr key={p.id} className="even:bg-[var(--bg-surface)]">
                      <td className={TW.td}>{p.nazev}</td>
                      <td className={TW.td}>{p.vyrobce} {p.model}</td>
                      <td className={TW.td}>{p.vyrobniCislo}</td>
                      <td className={TW.td}>{p.platnostKalibrace ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ') : '—'}</td>
                      <td className={`${TW.td} text-center`}>
                        <button type="button" onClick={() => { if (p.id) removePristroj.mutate({ revizeId, pristrojId: p.id }); }}
                          className="bg-red-500 text-white border-none px-2 py-0.5 cursor-pointer font-semibold text-xs rounded hover:bg-red-600 transition-colors"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ruční tabulka přístrojů (do protokolu) */}
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Přístroje v protokolu (ruční editace)</div>
          <table className="w-full text-sm border-collapse mt-1">
            <thead><tr>
              <th className={TW.th} style={{ width: '30%' }}>Přístroj / typ</th>
              <th className={TW.th} style={{ width: '20%' }}>Výrobní číslo</th>
              <th className={TW.th} style={{ width: '18%' }}>Kalibrován do</th>
              <th className={TW.th} style={{ width: '16%' }}>Třída přesnosti</th>
              <th className={TW.th}>Poznámka</th>
            </tr></thead>
            <tbody>
              {fd.pristroje.map((r, i) => (
                <tr key={i} className="even:bg-[var(--bg-surface)]">
                  <td className={TW.td}><input className={TW.tblInput} value={r.typ} onChange={e => updRow('pristroje', i, 'typ', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.sn} onChange={e => updRow('pristroje', i, 'sn', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.kalibrace} onChange={e => updRow('pristroje', i, 'kalibrace', e.target.value)} placeholder="dd.mm.rrrr" /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.trida} onChange={e => updRow('pristroje', i, 'trida', e.target.value)} /></td>
                  <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updRow('pristroje', i, 'poznamka', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal pro výběr přístroje */}
      <Modal isOpen={isPristrojModalOpen} onClose={() => setIsPristrojModalOpen(false)} title="Přidat měřicí přístroj">
        <div className="max-h-[400px] overflow-y-auto">
          {vsechnyPristroje.filter(p => !pouzitePristroje.find(pp => pp.id === p.id)).length > 0 ? (
            vsechnyPristroje
              .filter(p => !pouzitePristroje.find(pp => pp.id === p.id))
              .map(p => (
                <div key={p.id}
                  onClick={() => {
                    if (p.id) {
                      addPristroj.mutate({ revizeId, pristrojId: p.id }, {
                        onSuccess: () => {
                          const newRow: PristrojRow = {
                            typ: `${p.vyrobce} ${p.model}`.trim(),
                            sn: p.vyrobniCislo || '',
                            kalibrace: p.platnostKalibrace ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ') : '',
                            trida: '',
                            poznamka: '',
                          };
                          setFd(prev => {
                            const pristroje = [...prev.pristroje];
                            const emptyIdx = pristroje.findIndex(r => !r.typ && !r.sn);
                            if (emptyIdx >= 0) {
                              pristroje[emptyIdx] = newRow;
                            } else {
                              pristroje.push(newRow);
                            }
                            return { ...prev, pristroje };
                          });
                          setIsPristrojModalOpen(false);
                        },
                      });
                    }
                  }}
                  className="px-3.5 py-2.5 border-b border-slate-200 cursor-pointer flex justify-between items-center hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-800 mb-0.5">{p.nazev}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                      {p.platnostKalibrace && ` • Kalibrace: ${new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}`}
                    </div>
                  </div>
                  <span className="text-emerald-600 font-semibold text-sm">+ Přidat</span>
                </div>
              ))
          ) : (
            <div className="p-5 text-center text-[var(--text-muted)]">
              <p className="mb-2 text-sm">{vsechnyPristroje.length === 0 ? 'Nemáte žádné měřicí přístroje v systému.' : 'Všechny přístroje jsou již přiřazeny k této revizi.'}</p>
              <Link to="/pristroje" className="text-blue-600 underline text-sm">Přejít na správu přístrojů</Link>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══ 09 – POSUDEK ═══ */}
      <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-400">09</span> Posudek
        </div>
        <div className="p-4">
          <div className="mb-3.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Celkový výsledek ověření
            </div>
            <div className="flex gap-3 mb-3.5">
              <button
                className={`flex-1 py-3 px-4 border-2 rounded-lg cursor-pointer text-xs font-bold text-center transition-all tracking-wide ${
                  fd.verdikt === 'pass' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-300 bg-white text-[var(--text-muted)] hover:border-slate-400'
                }`}
                onClick={() => upd('verdikt', fd.verdikt === 'pass' ? '' : 'pass')} type="button">
                ✓ &nbsp; VYHOVUJE
              </button>
              <button
                className={`flex-1 py-3 px-4 border-2 rounded-lg cursor-pointer text-xs font-bold text-center transition-all tracking-wide ${
                  fd.verdikt === 'fail' ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-300 bg-white text-[var(--text-muted)] hover:border-slate-400'
                }`}
                onClick={() => upd('verdikt', fd.verdikt === 'fail' ? '' : 'fail')} type="button">
                ✗ &nbsp; NEVYHOVUJE – vyžadována nápravná opatření
              </button>
            </div>
          </div>
          <hr className="border-t border-dashed border-slate-200 my-2.5" />
          <div className="grid gap-2.5 mt-2.5">
            <div className="flex flex-col gap-1"><label className={TW.label}>Zjištěné závady / nedostatky</label>
              <textarea rows={3} className={`${TW.input} resize-y min-h-[70px]`} value={fd.posudekZavady} onChange={e => upd('posudekZavady', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Doporučení / termín odstranění závad</label>
              <textarea rows={2} className={`${TW.input} resize-y min-h-[70px]`} value={fd.posudekDoporuceni} onChange={e => upd('posudekDoporuceni', e.target.value)} /></div>
            <div className="flex flex-col gap-1"><label className={TW.label}>Použité normy a předpisy</label>
              <textarea rows={2} className={`${TW.input} resize-y min-h-[70px]`} value={fd.posudekNormy} onChange={e => upd('posudekNormy', e.target.value)} placeholder="ČSN EN 60204-1, zákon č. 250/2021 Sb., …" /></div>

          </div>
          <div className="grid grid-cols-2 gap-8 pt-5 pb-1">
            <div className="flex flex-col gap-1"><div className="border-b-2 border-slate-400 h-10" /><div className="text-xs uppercase tracking-wide text-[var(--text-muted)] text-center mt-1">Revizní technik – jméno, podpis, razítko</div></div>
            <div className="flex flex-col gap-1"><div className="border-b-2 border-slate-400 h-10" /><div className="text-xs uppercase tracking-wide text-[var(--text-muted)] text-center mt-1">Zástupce objednatele – jméno, podpis</div></div>
          </div>
        </div>
      </div>

    </div>
  );
}
