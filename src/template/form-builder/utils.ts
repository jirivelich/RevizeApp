// ─── Sdílené utility ─────────────────────────────────────────────────────────

import type { Block, SectionBlock } from './types';

/** Jednoduchá skupina bloků pro renderování */
export type RenderGroup =
  | { type: 'single'; block: Block; bi: number }
  | { type: 'pair'; left: { block: Block; bi: number }; right: { block: Block; bi: number } };

/**
 * Seskupí po sobě jdoucí dvojice oddílů s width='half' do párů – ty se
 * na A4 stránce rendrují vedle sebe. Ostatní bloky zůstávají jako 'single'.
 */
export function groupBlocks(blocks: Block[]): RenderGroup[] {
  const result: RenderGroup[] = [];
  let i = 0;
  while (i < blocks.length) {
    const bl = blocks[i];
    const next = blocks[i + 1];
    if (
      bl.kind === 'section' && bl.width === 'half' &&
      next?.kind === 'section' && (next as SectionBlock).width === 'half'
    ) {
      result.push({ type: 'pair', left: { block: bl, bi: i }, right: { block: next, bi: i + 1 } });
      i += 2;
    } else {
      result.push({ type: 'single', block: bl, bi: i });
      i++;
    }
  }
  return result;
}
