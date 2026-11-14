/**
 * Hromadný export: všechny dokumenty revize jako PDF + DOCX v jednom ZIPu.
 * Názvy souborů bez diakritiky.
 */
import type { DocInstance } from '../registry';
import { paginate } from '../paginate';
import { createOffscreenRoot } from './offscreen';
import { renderPdfBlob } from './pdf';
import { renderWordBlob } from './word';

export async function renderAllZip(
  docs: DocInstance[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const used = new Set<string>();
  const root = createOffscreenRoot();
  try {
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      onProgress?.(i, docs.length);
      const { html } = await paginate(root, doc.html);
      let name = doc.fileBase;
      for (let n = 2; used.has(name); n++) name = `${doc.fileBase}_${n}`;
      used.add(name);
      zip.file(`${name}.pdf`, await renderPdfBlob(html));
      zip.file(`${name}.docx`, await renderWordBlob(html, doc.title));
    }
    onProgress?.(docs.length, docs.length);
  } finally {
    root.remove();
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Stáhne blob jako soubor. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
