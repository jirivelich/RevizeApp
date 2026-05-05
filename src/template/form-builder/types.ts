// ─── Form Builder – sdílené typy ─────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select';
export type FreetextStyle = 'h1' | 'h2' | 'h3' | 'body';

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string;
  defaultValue: string;
}

export interface TableCol {
  id: string;
  label: string;
  width: number;
}

export interface TableCell {
  id: string;
  value: string;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

// ─── Položky uvnitř oddílu ────────────────────────────────────────────────────

/** Pole formuláře jako položka oddílu */
export type FieldItem = Field & { itemKind: 'field' };

/** Tabulka vložená přímo do oddílu (plná šířka, mimo grid polí) */
export interface TableItem {
  itemKind: 'table';
  id: string;
  title: string;
  titleVisible: boolean;
  hasHeader: boolean;
  cols: TableCol[];
  rows: TableRow[];
}

export type SectionItem = FieldItem | TableItem;

// ─────────────────────────────────────────────────────────────────────────────

export interface SectionBlock {
  id: string;
  kind: 'section';
  title: string;
  titleVisible: boolean;
  cols: 1 | 2 | 3;
  /** 'full' = celá šířka strány, 'half' = polovina (dva oddíly vedle sebe) */
  width: 'full' | 'half';
  /** Pokud true, ve fill módu lze přidávat libovolný počet instancí oddílu */
  repeatable?: boolean;
  items: SectionItem[];
}

/**
 * Počet instancí pro každý opakující se oddíl ve fill módu.
 * Klíč = SectionBlock.id, hodnota = počet instancí (≥ 1).
 * Klíče v FillData pro repeatable sekce: `${fieldId}_${instanceIndex}`
 */
export type RepeatCounts = Record<string, number>;

export interface TableBlock {
  id: string;
  kind: 'table';
  title: string;
  titleVisible: boolean;
  hasHeader: boolean;
  cols: TableCol[];
  rows: TableRow[];
}

export interface FreetextBlock {
  id: string;
  kind: 'freetext';
  text: string;
  style: FreetextStyle;
}

/** Diskriminovaná unie všech typů bloků */
export type Block = SectionBlock | TableBlock | FreetextBlock;

export interface Page {
  id: string;
  label: string;
  overflow: boolean;
  blocks: Block[];
}

export interface Doc {
  id: string;
  name: string;
  description: string;
  pages: Page[];
}

/** Data vyplněného formuláře – klíč = id pole/buňky, hodnota = text nebo boolean */
export type FillData = Record<string, string | boolean>;

/** Souřadnice vybraného bloku v editoru */
export interface SelBlk {
  pgIdx: number;
  blkIdx: number;
}
