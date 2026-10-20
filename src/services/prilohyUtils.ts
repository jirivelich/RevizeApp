import type { RevizePriloha } from '../types';

export const PRILOHA_MAX_BYTES = 15 * 1024 * 1024;
export const PRILOHA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const PRILOHA_MIME = PRILOHA_ACCEPT.split(',');
const MAX_IMAGE_DIMENSION = 2000;

export const isPdf = (p: Pick<RevizePriloha, 'mimeType'>) => p.mimeType === 'application/pdf';

export function formatVelikost(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Soubor se nepodařilo přečíst'));
    reader.readAsDataURL(file);
  });
}

/** Zmenší velké fotky (max 2000 px, JPEG 0.85); PNG/GIF a malé obrázky nechá být. */
async function compressImage(file: File): Promise<{ data: string; mimeType: string }> {
  const original = await readAsDataUrl(file);
  if (file.type === 'image/gif' || file.type === 'image/png') return { data: original, mimeType: file.type };
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Obrázek se nepodařilo načíst'));
    i.src = original;
  });
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return { data: original, mimeType: file.type };
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' };
}

/** Připraví soubor k nahrání. Při nepodporovaném typu nebo velikosti vyhodí Error s českou zprávou. */
export async function prepareFile(file: File): Promise<{ nazev: string; mimeType: string; data: string }> {
  if (!PRILOHA_MIME.includes(file.type)) {
    throw new Error(`„${file.name}“: nepodporovaný typ (povoleny jsou obrázky a PDF)`);
  }
  if (file.size > PRILOHA_MAX_BYTES) {
    throw new Error(`„${file.name}“ je příliš velký (max. 15 MB)`);
  }
  if (file.type === 'application/pdf') {
    return { nazev: file.name, mimeType: file.type, data: await readAsDataUrl(file) };
  }
  const { data, mimeType } = await compressImage(file);
  return { nazev: file.name, mimeType, data };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Vykreslí všechny stránky PDF do data-URL obrázků (pro tisk ve zprávě). */
export async function pdfToImages(dataUrl: string, scale = 1.5): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await dataUrlToBlob(dataUrl).arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.85));
  }
  return pages;
}

/** Vytiskne samostatnou přílohu přes skrytý iframe. */
export function printPriloha(p: RevizePriloha): void {
  if (!p.data) return;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);

  if (isPdf(p)) {
    const url = URL.createObjectURL(dataUrlToBlob(p.data));
    iframe.src = url;
    iframe.onload = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } finally { setTimeout(() => URL.revokeObjectURL(url), 60000); cleanup(); }
    };
    document.body.appendChild(iframe);
  } else {
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write('<!doctype html><html><head><style>@page{margin:10mm}body{margin:0}img{max-width:100%;max-height:277mm;display:block;margin:0 auto}</style></head><body></body></html>');
    doc.close();
    const img = doc.createElement('img');
    img.onload = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } finally { cleanup(); } };
    img.src = p.data;
    doc.body.appendChild(img);
  }
}

export interface PrilohaPrintItem {
  nazev: string;
  poznamka?: string;
  images: string[];
}

/** Načte přílohy revize připravené k tisku (PDF rozložené na obrázky stránek). Selhání nesmí rozbít tisk revize. */
export async function loadPrilohyForPrint(revizeId: number): Promise<PrilohaPrintItem[]> {
  const { prilohaService } = await import('./database');
  try {
    const list = await prilohaService.getByRevize(revizeId);
    const items: PrilohaPrintItem[] = [];
    for (const meta of list) {
      try {
        const full = await prilohaService.getById(meta.id!);
        if (!full.data) continue;
        const images = isPdf(full) ? await pdfToImages(full.data) : [full.data];
        items.push({ nazev: full.nazev, poznamka: full.poznamka, images });
      } catch (e) {
        console.error(`Příloha „${meta.nazev}“ se nepodařila připravit k tisku`, e);
      }
    }
    return items;
  } catch {
    return [];
  }
}
