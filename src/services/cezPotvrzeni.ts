/**
 * Formulář ČEZ Distribuce „Potvrzení o vydání zprávy o revizi elektrické instalace“
 * pro odběrné místo. Vyplňuje se přímo originální PDF formulář (AcroForm) uložený
 * v public/sablony – vzhled tedy přesně odpovídá dokumentu distributora.
 */
import type { Nastaveni, Revize, Zakaznik } from '../types';
import type { CezPotvrzeni, OdberneMistoData } from '../types/odberneMisto';

export const CEZ_SABLONA_URL = '/sablony/cez-potvrzeni-revize-om.pdf';
export const CEZ_FONT_URL = '/fonts/LiberationSans-Regular.ttf';

/** Názvy polí v PDF formuláři ČEZ (ověřeno na verzi formuláře „RZ formulář“). */
export const POLE = {
  zakaznikJmeno: 'Jmeno a prijmeni 1',
  zakaznikIco: 'ICO 1',
  zakaznikDic: 'DIC 1',
  zakaznikMobil: 'Mobil 1',
  zakaznikEmail: 'Email 1',
  ean: 'EAN OM',
  cisloOm: 'Cislo OM',
  ulice: 'Ulice 2',
  cisloDomu: 'c. p. 2',
  psc: 'PSC 3',
  obec: 'Obec 2',
  mistniCast: 'Mistni cast',
  parcela: 'Cislo parcelni',
  katastr: 'Katastralni uzemi',
  patro: 'Patro',
  cisloBytu: 'Cislo bytu',
  upresneni: 'Upresneni mista odberu',
  jistic: 'Hodnota jistice',
  prevodMtp: 'Prevod',
  tuvKw: 'kW 1',
  akuKw: 'kW 2',
  primotopKw: 'kW 3',
  tcPohonKw: 'kW 4',
  tcDotopKw: 'kW 5',
  tcVykonKw: 'kW 6',
  jineNazev: 'Jine',
  jineKw: 'kW 7',
  technikJmeno: 'Jmeno a prijmeni 2',
  technikOsvedceni: 'Evidencni cislo osvedceni',
  vypracovano: 'Zprava o revizi',
  cisloZpravy: 'Cislo zpravy',
  technikIco: 'ICO 2',
  technikMobil: 'Mobil 2',
  technikEmail: 'Email 2',
} as const;

export const POLE_1F = 'Check Box1';
export const POLE_3F = 'Check Box2';

export type PoleCez = keyof typeof POLE;

export interface AdresaOm {
  ulice: string;
  cisloDomu: string;
  psc: string;
  obec: string;
}

/**
 * Rozloží adresu z revize („Lipová 123/4, 405 02 Děčín“, „Lipová 5, Brno“,
 * „Horní Lhota 12“) na části formuláře. Co nejde rozpoznat, zůstane prázdné.
 */
export function rozlozAdresu(adresa?: string | null): AdresaOm {
  const out: AdresaOm = { ulice: '', cisloDomu: '', psc: '', obec: '' };
  if (!adresa?.trim()) return out;
  const casti = adresa.split(',').map((s) => s.trim()).filter(Boolean);
  const prvni = casti.shift() ?? '';
  const ulice = prvni.match(/^(.*?)\s+(\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)?)$/);
  if (ulice) { out.ulice = ulice[1]; out.cisloDomu = ulice[2].replace(/\s+/g, ''); } else { out.ulice = prvni; }
  for (const c of casti) {
    const psc = c.match(/^(\d{3})\s?(\d{2})\s*(.*)$/);
    if (psc) { out.psc = `${psc[1]} ${psc[2]}`; if (psc[3]) out.obec = psc[3].trim(); }
    else if (!out.obec && !/^(česk|czech)/i.test(c)) out.obec = c;
  }
  // „Horní Lhota 12“ bez ulice: obec s číslem popisným
  if (!out.obec && casti.length === 0 && out.cisloDomu) { out.obec = out.ulice; out.ulice = ''; }
  return out;
}

/** Datum ISO → „14. 3. 2026“. */
export function datumCesky(iso?: string | Date | null): string {
  if (!iso) return '';
  const s = typeof iso === 'string' ? iso : iso.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : s;
}

const t = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const kw = (v: string) => t(v).replace('.', ',');

/**
 * Výchozí hodnoty polí odvozené z dat aplikace (revize, zákazník, odběrné místo, nastavení).
 * Uživatel je může v záložce Odběrné místo přepsat – přepsané hodnoty jsou v `om.cez`.
 */
export function vychoziHodnotyCez(
  revize: Partial<Revize>,
  om: OdberneMistoData,
  zakaznik?: Zakaznik | null,
  nastaveni?: Partial<Nastaveni> | null,
): Record<PoleCez, string> {
  const a = rozlozAdresu(revize.adresa);
  const n = nastaveni ?? {};
  return {
    zakaznikJmeno: t(zakaznik?.nazev) || t(revize.objednatel),
    zakaznikIco: t(zakaznik?.ico),
    zakaznikDic: t(zakaznik?.dic).replace(/^CZ/i, ''),
    zakaznikMobil: t(zakaznik?.telefon),
    zakaznikEmail: t(zakaznik?.email),
    ean: t(om.ean),
    cisloOm: '',
    ulice: a.ulice,
    cisloDomu: a.cisloDomu,
    psc: a.psc,
    obec: a.obec,
    mistniCast: '',
    parcela: t(om.parcela),
    katastr: '',
    patro: '',
    cisloBytu: '',
    upresneni: '',
    jistic: t(om.jisticProud).replace(/\s*A$/i, ''),
    prevodMtp: '',
    tuvKw: '', akuKw: '', primotopKw: '', tcPohonKw: '', tcDotopKw: '', tcVykonKw: '', jineNazev: '', jineKw: '',
    technikJmeno: t(revize.rtJmeno) || t(n.reviznniTechnikJmeno),
    technikOsvedceni: t(revize.rtCisloOsvedceni) || t(n.reviznniTechnikOsvedceni) || t(revize.rtCisloOpravneni) || t(n.reviznniTechnikCisloOpravneni),
    vypracovano: datumCesky(revize.datumVypracovani || revize.datumDokonceni || revize.datum),
    cisloZpravy: t(revize.cisloRevize),
    technikIco: t(n.reviznniTechnikIco) || t(n.firmaIco),
    technikMobil: t(n.kontaktTelefon),
    technikEmail: t(n.kontaktEmail),
  };
}

/** Výsledné hodnoty: uživatelem zadané v om.cez mají přednost před výchozími. */
export function hodnotyCez(
  revize: Partial<Revize>,
  om: OdberneMistoData,
  zakaznik?: Zakaznik | null,
  nastaveni?: Partial<Nastaveni> | null,
): { pole: Record<PoleCez, string>; faze: '' | '1' | '3' } {
  const vychozi = vychoziHodnotyCez(revize, om, zakaznik, nastaveni);
  const cez: Partial<CezPotvrzeni> = om.cez ?? {};
  const pole = { ...vychozi };
  for (const k of Object.keys(POLE) as PoleCez[]) {
    const v = (cez as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) pole[k] = v.trim();
  }
  for (const k of ['tuvKw', 'akuKw', 'primotopKw', 'tcPohonKw', 'tcDotopKw', 'tcVykonKw', 'jineKw'] as const) pole[k] = kw(pole[k]);
  pole.jistic = pole.jistic.replace(/\s*A$/i, '');
  return { pole, faze: om.pocetFazi };
}

/**
 * Vyplní originální PDF formulář ČEZ. Písmo s českou diakritikou (Liberation Sans,
 * rozměrově shodné s Arialem formuláře) se vloží do PDF a použije pro vzhled polí.
 */
export async function vyplnPdfCez(
  sablona: ArrayBuffer | Uint8Array,
  fontBytes: ArrayBuffer | Uint8Array,
  pole: Record<PoleCez, string>,
  faze: '' | '1' | '3',
  razitko?: string | null,
): Promise<Uint8Array> {
  const { PDFDocument, PDFName, PDFBool, PDFDict } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  const pdf = await PDFDocument.load(sablona);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const form = pdf.getForm();

  for (const [klic, nazevPole] of Object.entries(POLE) as [PoleCez, string][]) {
    const hodnota = pole[klic] ?? '';
    const pf = form.getTextField(nazevPole);
    // Vyplněné hodnoty černě (formulář má šedou výchozí barvu textu)
    pf.acroField.setDefaultAppearance('/Arial 8 Tf 0 g');
    pf.setText(hodnota);
    // Dlouhý text zmenšit, aby se vešel do pole (výchozí 8 pt jako ve formuláři)
    const sirka = pf.acroField.getWidgets()[0]?.getRectangle().width ?? 100;
    let velikost = 8;
    while (velikost > 5 && font.widthOfTextAtSize(hodnota, velikost) > sirka - 4) velikost -= 0.5;
    pf.setFontSize(velikost);
    pf.updateAppearances(font);
  }
  const cb1 = form.getCheckBox(POLE_1F);
  const cb3 = form.getCheckBox(POLE_3F);
  if (faze === '1') cb1.check(); else cb1.uncheck();
  if (faze === '3') cb3.check(); else cb3.uncheck();

  // Zaškrtnutí kreslí originál znakem písma ZapfDingbats, který některé prohlížeče
  // (hlavně na mobilech) nezobrazí – nahradit vektorovou fajfkou ve stejném rámečku.
  for (const cb of [cb1, cb3]) {
    for (const w of cb.acroField.getWidgets()) {
      const ap = w.getNormalAppearance();
      if (!(ap instanceof PDFDict)) continue;
      const zapnuto = ap.keys().find((k) => k.asString() !== '/Off');
      if (!zapnuto) continue;
      const r = w.getRectangle();
      const sw = r.width;
      const sh = r.height;
      const obsah = [
        'q 0.94902 0.309799 0 RG 0.5 0.5', (sw - 1).toFixed(4), (sh - 1).toFixed(4), 're s Q',
        'q 0 g 0 G 1.3 w 1 J 1 j',
        (sw * 0.2).toFixed(3), (sh * 0.52).toFixed(3), 'm',
        (sw * 0.42).toFixed(3), (sh * 0.25).toFixed(3), 'l',
        (sw * 0.8).toFixed(3), (sh * 0.8).toFixed(3), 'l S Q',
      ].join(' ');
      const stream = pdf.context.stream(obsah, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, sw, sh], Resources: {} });
      ap.set(zapnuto, pdf.context.register(stream));
    }
  }

  // Formulář se nezplošťuje: textová pole mají vzhled s vloženým písmem (diakritika),
  // zaškrtávátka si ponechají originální vzhled ČEZ a hodnoty jde v PDF ještě ručně opravit.
  // NeedAppearances=false → prohlížeče použijí připravený vzhled a nepřekreslují ho.
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.False);

  if (razitko) {
    const m = razitko.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (m) {
      const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      const img = m[1].toLowerCase() === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      // Oblast „Podpis (razítko*)“ – vpravo dole nad linkou podpisu
      const box = { x: 400, y: 62, w: 160, h: 42 };
      const sc = Math.min(box.w / img.width, box.h / img.height);
      const w = img.width * sc;
      const h = img.height * sc;
      pdf.getPage(0).drawImage(img, { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, width: w, height: h });
    }
  }

  return pdf.save();
}

/** Stáhne šablonu a písmo, vyplní formulář a nabídne PDF ke stažení. */
export async function stahniPotvrzeniCez(
  pole: Record<PoleCez, string>,
  faze: '' | '1' | '3',
  nazevSouboru: string,
  razitko?: string | null,
): Promise<void> {
  const [sablona, font] = await Promise.all([
    fetch(CEZ_SABLONA_URL).then((r) => { if (!r.ok) throw new Error('Šablonu formuláře ČEZ se nepodařilo načíst.'); return r.arrayBuffer(); }),
    fetch(CEZ_FONT_URL).then((r) => { if (!r.ok) throw new Error('Písmo pro formulář se nepodařilo načíst.'); return r.arrayBuffer(); }),
  ]);
  const bytes = await vyplnPdfCez(sablona, font, pole, faze, razitko);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nazevSouboru;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
