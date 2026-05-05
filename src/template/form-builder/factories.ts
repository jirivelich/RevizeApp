// ─── Tovární funkce pro tvorbu datových objektů ──────────────────────────────

import type { Field, FieldItem, TableItem, TableCol, TableRow, SectionBlock, TableBlock, FreetextBlock, Page, Doc } from './types';

export const FIELD_TYPES = ['text', 'number', 'date', 'textarea', 'checkbox', 'select'] as const;

/** Generuje krátké náhodné ID */
export const uid = (): string => Math.random().toString(36).slice(2, 8);

export const mkField = (over: Partial<Field> = {}): Field => ({
  id: uid(), type: 'text', label: 'Pole', placeholder: '', required: false, options: '', defaultValue: '',
  ...over,
});

/** Políčko jako SectionItem (s itemKind diskriminatorém) */
export const mkFieldItem = (over: Partial<Field> = {}): FieldItem => ({
  ...mkField(over),
  itemKind: 'field',
});

/** Tabulkový blok uvnitř oddílu (ne samostatný blok stránky) */
export const mkTableItem = (r = 3, c = 3): TableItem => {
  const cols: TableCol[] = Array.from({ length: c }, (_, i) => ({
    id: uid(), label: `Sloupec ${i + 1}`, width: 1,
  }));
  return {
    itemKind: 'table', id: uid(),
    title: 'Tabulka', titleVisible: true, hasHeader: true,
    cols,
    rows: Array.from({ length: r }, () => mkRow(cols)),
  };
};

export const mkRow = (cols: TableCol[]): TableRow => ({
  id: uid(),
  cells: cols.map(() => ({ id: uid(), value: '' })),
});

export const mkSection = (): SectionBlock => ({
  id: uid(), kind: 'section',
  title: 'Nový oddíl', titleVisible: true,
  cols: 1,
  width: 'full',
  items: [mkFieldItem({ label: 'Pole 1' })],
});

export const mkTable = (r = 3, c = 3): TableBlock => {
  const cols: TableCol[] = Array.from({ length: c }, (_, i) => ({
    id: uid(), label: `Sloupec ${i + 1}`, width: 1,
  }));
  return {
    id: uid(), kind: 'table',
    title: 'Tabulka', titleVisible: true,
    hasHeader: true,
    cols,
    rows: Array.from({ length: r }, () => mkRow(cols)),
  };
};

export const mkFreetext = (): FreetextBlock => ({
  id: uid(), kind: 'freetext',
  text: 'Nadpis / popis', style: 'h2',
});

export const mkPage = (n = 1): Page => ({
  id: uid(), label: `Strana ${n}`,
  overflow: false,
  blocks: [mkSection()],
});

export const defaultDoc = (): Doc => ({
  id: uid(), name: 'Nový dokument', description: '',
  pages: [mkPage(1)],
});
