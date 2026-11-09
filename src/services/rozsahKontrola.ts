import type { DruhRozsahu, RevizeDokument, RozsahPolozka } from '../types';

export type UrovenZjisteni = 'kriticka' | 'upozorneni' | 'doporuceni';

export interface Zjisteni {
  uroven: UrovenZjisteni;
  kod: string;
  text: string;
  /** Pole formuláře (kotva v záložce Rozsah a podklady), ke kterému se zjištění vztahuje. */
  pole: 'druhRozsahu' | 'rozsahPolozky' | 'dokumenty';
}

export const DRUH_ROZSAHU_LABELS: Record<DruhRozsahu, string> = {
  celkova: 'Celková revize',
  dilci: 'Dílčí revize',
  zarizeni: 'Revize konkrétního zařízení / části instalace',
  nedokoncena: 'Nedokončená revize (nebylo možné provést všechny úkony)',
};

export const DOKUMENT_STAV_LABELS: Record<RevizeDokument['stav'], string> = {
  predlozeno: 'Předloženo',
  nepredlozeno: 'Nepředloženo',
  neaktualni: 'Neaktuální',
  neodpovida: 'Neodpovídá skutečnosti',
  nerelevantni: 'Nerelevantní',
};

/**
 * Zkontroluje soulad deklarovaného druhu revize s vyplněným rozsahem a evidencí podkladů.
 * Funkce je čistá a vysvětlitelná: každé zjištění nese kód, text a pole formuláře.
 * Nic nerozhoduje o bezpečnosti zařízení, jen upozorňuje na rozpory k posouzení technikem.
 */
export function zkontrolujRozsahAPodklady(
  druh: DruhRozsahu | undefined | null,
  polozky: RozsahPolozka[],
  dokumenty: RevizeDokument[],
): Zjisteni[] {
  const z: Zjisteni[] = [];
  const revidovano = polozky.filter(p => p.typ === 'revidovano');
  const vyloucene = polozky.filter(p => p.typ === 'vyloucenoRozsah');
  const neovereno = polozky.filter(p => p.typ === 'neovereno');

  if (!druh) {
    z.push({ uroven: 'upozorneni', kod: 'ROZSAH_DRUH_CHYBI', pole: 'druhRozsahu',
      text: 'Není určen druh revize z hlediska rozsahu (celková, dílčí, konkrétní zařízení, nedokončená).' });
  }

  if (druh === 'celkova') {
    if (neovereno.length > 0) {
      z.push({ uroven: 'kriticka', kod: 'ROZSAH_CELKOVA_NEOVERENO', pole: 'rozsahPolozky',
        text: `Revize je označena jako celková, ale je evidováno ${neovereno.length} neověřených částí. Změňte druh na dílčí nebo nedokončenou, případně seznam upravte.` });
    }
    if (vyloucene.length > 0) {
      z.push({ uroven: 'upozorneni', kod: 'ROZSAH_CELKOVA_VYLOUCENO', pole: 'rozsahPolozky',
        text: `Revize je označena jako celková, ale jsou uvedeny části vyloučené z rozsahu (${vyloucene.length}). Posuďte, zda nejde o dílčí revizi.` });
    }
  }

  if ((druh === 'dilci' || druh === 'zarizeni') && revidovano.length === 0) {
    z.push({ uroven: 'upozorneni', kod: 'ROZSAH_DILCI_BEZ_POLOZEK', pole: 'rozsahPolozky',
      text: 'U dílčí revize nebo revize konkrétního zařízení není uvedeno, co bylo revidováno.' });
  }

  if (druh === 'nedokoncena' && neovereno.length === 0) {
    z.push({ uroven: 'upozorneni', kod: 'ROZSAH_NEDOKONCENA_BEZ_POLOZEK', pole: 'rozsahPolozky',
      text: 'U nedokončené revize není uvedeno, které úkony nebo části nebylo možné ověřit a proč.' });
  }

  for (const p of [...vyloucene, ...neovereno]) {
    if (!p.duvod?.trim()) {
      z.push({ uroven: 'upozorneni', kod: 'ROZSAH_BEZ_DUVODU', pole: 'rozsahPolozky',
        text: `U položky „${p.nazev}“ chybí důvod ${p.typ === 'neovereno' ? 'neověření' : 'vyloučení z rozsahu'}.` });
    }
  }

  if (dokumenty.length === 0) {
    z.push({ uroven: 'doporuceni', kod: 'DOK_PRAZDNE', pole: 'dokumenty',
      text: 'Není evidován žádný podklad. Uveďte předloženou dokumentaci, nebo u chybějící dokumentace stav „Nepředloženo“.' });
  }

  for (const d of dokumenty) {
    if (d.stav === 'nepredlozeno') {
      z.push({
        uroven: d.znemoznujeOvereni ? 'kriticka' : 'upozorneni',
        kod: d.znemoznujeOvereni ? 'DOK_CHYBI_BRANI_OVERENI' : 'DOK_CHYBI',
        pole: 'dokumenty',
        text: d.znemoznujeOvereni
          ? `Dokument „${d.nazev}“ nebyl předložen a bez něj nelze provést potřebné ověření. Uveďte tuto skutečnost v rozsahu a závěru.`
          : `Dokument „${d.nazev}“ nebyl předložen. Samotné uvedení této skutečnosti nenahrazuje potřebné ověření.`,
      });
    } else if (d.stav === 'neodpovida') {
      z.push({ uroven: 'upozorneni', kod: 'DOK_NEODPOVIDA', pole: 'dokumenty',
        text: `Dokument „${d.nazev}“ neodpovídá skutečnosti. Uveďte rozdíly v poznámce nebo v závadách.` });
    } else if (d.stav === 'neaktualni') {
      z.push({ uroven: 'upozorneni', kod: 'DOK_NEAKTUALNI', pole: 'dokumenty',
        text: `Dokument „${d.nazev}“ je neaktuální. Posuďte, zda je jej možné použít jako podklad.` });
    }
  }

  return z;
}

/**
 * Navrhne text o chybějící dokumentaci pro sekci Podklady.
 * Pouze návrh, do zprávy se vkládá až na pokyn technika.
 */
export function navrhTextChybejiciDokumentace(dokumenty: RevizeDokument[]): string {
  const chybi = dokumenty.filter(d => d.stav === 'nepredlozeno');
  if (chybi.length === 0) return '';
  const seznam = chybi.map(d => d.nazev).join(', ');
  let text = `Následující dokumentace nebyla revidujícímu technikovi předložena: ${seznam}.`;
  const brani = chybi.filter(d => d.znemoznujeOvereni);
  if (brani.length > 0) {
    text += ` Z důvodu chybějící dokumentace nebylo možné ověřit: ${brani.map(d => d.poznamka?.trim() || d.nazev).join('; ')}.`;
  }
  return text;
}

/** Návrh textu pro rozsah z evidovaných položek (podle typu). */
export function navrhTextRozsahu(polozky: RozsahPolozka[]): { rozsah: string; predmetNeni: string; neovereno: string } {
  const radky = (typ: RozsahPolozka['typ'], sDuvodem: boolean) =>
    polozky
      .filter(p => p.typ === typ)
      .map(p => (sDuvodem && p.duvod?.trim() ? `${p.nazev} (${p.duvod.trim()})` : p.nazev))
      .join('\n');
  return {
    rozsah: radky('revidovano', false),
    predmetNeni: radky('vyloucenoRozsah', true),
    neovereno: radky('neovereno', true),
  };
}
