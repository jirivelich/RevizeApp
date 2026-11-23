import type { AIChatPriloha } from '../services/api';

/** Typy souborů, které AI chat přijme (PDF a obrázky). */
export const PRILOHA_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
/** Max. velikost PDF (API přijme požadavek do 32 MB, base64 zvětší soubor o třetinu). */
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
/** Fotky se zmenší na tuto delší stranu – stačí na přečtení textu a šetří přenos. */
const MAX_STRANA_FOTKY = 2000;

function nactiJakoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Soubor se nepodařilo načíst.'));
    r.readAsDataURL(blob);
  });
}

const base64Z = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

/** Zmenší fotku a převede ji na JPEG (fotky z telefonu mívají přes 5 MB, což API nepřijme). */
async function zmensiFotku(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Obrázek se nepodařilo otevřít (podporované jsou JPEG, PNG a WebP).'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_STRANA_FOTKY / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Obrázek se nepodařilo zpracovat.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Připraví soubor jako přílohu AI chatu (PDF beze změny, fotky zmenšené do JPEG). */
export async function souborNaPrilohu(file: File): Promise<AIChatPriloha> {
  const jePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (jePdf) {
    if (file.size > MAX_PDF_BYTES) throw new Error(`PDF „${file.name}“ je příliš velké (max. 15 MB).`);
    return { nazev: file.name, typ: 'application/pdf', data: base64Z(await nactiJakoDataUrl(file)) };
  }
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error(`Soubor „${file.name}“ nelze přiložit – podporované jsou PDF a obrázky.`);
  }
  const nazev = file.name.replace(/\.(png|webp|heic|heif)$/i, '.jpg');
  return { nazev, typ: 'image/jpeg', data: base64Z(await zmensiFotku(file)) };
}
