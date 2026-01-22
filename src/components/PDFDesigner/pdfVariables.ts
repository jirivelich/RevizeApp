// pdfVariables.ts - Zpracování proměnných pro PDF
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../../types';

// Data pro renderování PDF
export interface PDFRenderData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  rozvadece?: Rozvadec[];
  okruhy?: Record<number, Okruh[]>; // rozvadecId -> okruhy
  zavady?: Zavada[];
  mistnosti?: Mistnost[];
  zarizeni?: Record<number, Zarizeni[]>; // mistnostId -> zarizeni
  pouzitePristroje?: MericiPristroj[];
  zakaznik?: Zakaznik | null;
}

// Context pro repeater - obsahuje aktuální položku
export interface RepeaterContext {
  item: Rozvadec | Mistnost;
  index: number;
  okruhy?: Okruh[];
  zarizeni?: Zarizeni[];
}

/**
 * Získá hodnotu proměnné podle cesty
 */
export function getVariableValue(
  path: string, 
  data: PDFRenderData,
  repeaterContext?: RepeaterContext
): string {
  const { revize, nastaveni, zakaznik, rozvadece, zavady, mistnosti, pouzitePristroje } = data;
  
  // Item z repeateru (aktuální rozvaděč/místnost)
  if (path.startsWith('item.') && repeaterContext) {
    const field = path.replace('item.', '');
    const item = repeaterContext.item;
    
    if (field === 'index') return String(repeaterContext.index + 1);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (item as any)[field];
    return val?.toString() || '-';
  }
  
  // Revize
  if (path.startsWith('revize.')) {
    const field = path.replace('revize.', '') as keyof Revize;
    const val = revize[field];
    
    // Formátování dat
    if (field === 'datum' || field === 'datumDokonceni' || field === 'datumPlatnosti' || field === 'datumVypracovani') {
      return val ? new Date(val as string).toLocaleDateString('cs-CZ') : '-';
    }
    
    return val?.toString() || '-';
  }
  
  // Firma (z nastavení)
  if (path.startsWith('firma.')) {
    const field = path.replace('firma.', '');
    if (!nastaveni) return '-';
    const firmaMap: Record<string, string> = {
      nazev: nastaveni.firmaJmeno || '',
      adresa: nastaveni.firmaAdresa || '',
      ico: nastaveni.firmaIco || '',
      dic: nastaveni.firmaDic || '',
      logo: nastaveni.logo || '',
    };
    return firmaMap[field] || '-';
  }
  
  // Technik (z nastavení)
  if (path.startsWith('technik.')) {
    const field = path.replace('technik.', '');
    if (!nastaveni) return '-';
    const technikMap: Record<string, string> = {
      jmeno: nastaveni.reviznniTechnikJmeno || '',
      cisloOpravneni: nastaveni.reviznniTechnikCisloOpravneni || '',
      osvedceni: nastaveni.reviznniTechnikOsvedceni || '',
      adresa: nastaveni.reviznniTechnikAdresa || '',
      ico: nastaveni.reviznniTechnikIco || '',
      telefon: nastaveni.kontaktTelefon || '',
      email: nastaveni.kontaktEmail || '',
    };
    return technikMap[field] || '-';
  }
  
  // Nastavení (přímo)
  if (path.startsWith('nastaveni.')) {
    const field = path.replace('nastaveni.', '') as keyof Nastaveni;
    if (!nastaveni) return '-';
    return nastaveni[field]?.toString() || '-';
  }
  
  // Zákazník
  if (path.startsWith('zakaznik.')) {
    const field = path.replace('zakaznik.', '') as keyof Zakaznik;
    if (!zakaznik) return '-';
    return zakaznik[field]?.toString() || '-';
  }
  
  // Stránkování - placeholder pro pozdější nahrazení
  if (path.startsWith('page.')) {
    const field = path.replace('page.', '');
    if (field === 'current') return '{{PAGE}}';
    if (field === 'total') return '{{PAGES}}';
    if (field === 'info') return 'Strana {{PAGE}} z {{PAGES}}';
    return '-';
  }
  
  // Datum
  if (path.startsWith('datum.')) {
    const field = path.replace('datum.', '');
    const now = new Date();
    if (field === 'dnes') return now.toLocaleDateString('cs-CZ');
    if (field === 'cas') return now.toLocaleTimeString('cs-CZ');
    if (field === 'rok') return String(now.getFullYear());
    return '-';
  }
  
  // Statistiky
  if (path === 'stats.pocetRozvadecu') return rozvadece?.length.toString() || '0';
  if (path === 'stats.pocetZavad') return zavady?.length.toString() || '0';
  if (path === 'stats.pocetMistnosti') return mistnosti?.length.toString() || '0';
  if (path === 'stats.pocetPristroju') return pouzitePristroje?.length.toString() || '0';
  
  // Speciální
  if (path === 'today') return new Date().toLocaleDateString('cs-CZ');
  
  return '-';
}

/**
 * Nahradí proměnné v textu skutečnými hodnotami
 * Podporuje formáty: ${var}, {{var}} a přímé cesty
 */
export function resolveVariables(
  text: string, 
  data: PDFRenderData,
  repeaterContext?: RepeaterContext
): string {
  if (!text) return '';
  
  let resolved = text;
  
  // Nahradit ${...} proměnné
  const dollarVarRegex = /\$\{([^}]+)\}/g;
  resolved = resolved.replace(dollarVarRegex, (_, varPath) => 
    getVariableValue(varPath, data, repeaterContext)
  );
  
  // Nahradit {{...}} proměnné  
  const mustacheRegex = /\{\{([^}]+)\}\}/g;
  resolved = resolved.replace(mustacheRegex, (match, varPath) => {
    // Zachovat placeholder pro stránkování
    if (varPath === 'PAGE' || varPath === 'PAGES') return match;
    return getVariableValue(varPath.trim(), data, repeaterContext);
  });
  
  return resolved;
}

/**
 * Získá data pro tabulku podle typu
 */
export function getTableData(
  type: string, 
  data: PDFRenderData,
  repeaterContext?: RepeaterContext
): Record<string, unknown>[] {
  switch (type) {
    case 'rozvadece':
      return (data.rozvadece || []).map(r => ({
        nazev: r.nazev,
        oznaceni: r.oznaceni,
        umisteni: r.umisteni,
        typRozvadece: r.typRozvadece,
        stupenKryti: r.stupenKryti,
        poznamka: r.poznamka,
      }));
      
    case 'okruhy':
      // Pokud jsme v kontextu repeateru, použít okruhy pro daný rozvaděč
      if (repeaterContext?.okruhy) {
        return repeaterContext.okruhy.map(o => formatOkruh(o));
      }
      // Jinak všechny okruhy
      const allOkruhy: Okruh[] = [];
      if (data.okruhy) {
        Object.values(data.okruhy).forEach(okruhyList => {
          allOkruhy.push(...okruhyList);
        });
      }
      return allOkruhy.map(o => formatOkruh(o));
      
    case 'zavady':
      return (data.zavady || []).map(z => ({
        popis: z.popis,
        zavaznost: z.zavaznost,
        stav: z.stav,
        poznamka: z.poznamka || '-',
      }));
      
    case 'mistnosti':
      return (data.mistnosti || []).map(m => ({
        nazev: m.nazev,
        typ: m.typ,
        plocha: m.plocha,
        patro: m.patro || '-',
        prostredi: m.prostredi || '-',
      }));
      
    case 'pristroje':
      return (data.pouzitePristroje || []).map(p => ({
        nazev: p.nazev,
        vyrobce: p.vyrobce,
        model: p.model,
        vyrobniCislo: p.vyrobniCislo,
        typPristroje: p.typPristroje,
        platnostKalibrace: p.platnostKalibrace 
          ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ') 
          : '-',
      }));
      
    case 'zarizeni':
      // Pokud jsme v kontextu repeateru, použít zařízení pro danou místnost
      if (repeaterContext?.zarizeni) {
        return repeaterContext.zarizeni.map(z => formatZarizeni(z));
      }
      // Jinak všechna zařízení
      const allZarizeni: Zarizeni[] = [];
      if (data.zarizeni) {
        Object.values(data.zarizeni).forEach(zarizeniList => {
          allZarizeni.push(...zarizeniList);
        });
      }
      return allZarizeni.map(z => formatZarizeni(z));
      
    default:
      return [];
  }
}

function formatOkruh(o: Okruh): Record<string, unknown> {
  return {
    cislo: o.cislo?.toString() || '-',
    nazev: o.nazev || '-',
    jisticTyp: o.jisticTyp || '-',
    jisticProud: o.jisticProud || '-',
    pocetFazi: o.pocetFazi?.toString() || '-',
    vodic: o.vodic || '-',
    izolacniOdpor: o.izolacniOdpor != null ? o.izolacniOdpor.toFixed(2) : '-',
    impedanceSmycky: o.impedanceSmycky != null ? o.impedanceSmycky.toFixed(2) : '-',
    proudovyChranicMa: o.proudovyChranicMa || '-',
    casOdpojeni: o.casOdpojeni != null ? o.casOdpojeni.toString() : '-',
  };
}

function formatZarizeni(z: Zarizeni): Record<string, unknown> {
  return {
    nazev: z.nazev || '-',
    oznaceni: z.oznaceni || '-',
    pocetKs: z.pocetKs?.toString() || '1',
    trida: z.trida || '-',
    prikonW: z.prikonW?.toString() || '-',
    stav: z.stav || '-',
    poznamka: z.poznamka || '-',
  };
}
