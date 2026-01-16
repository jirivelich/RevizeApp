// Typy pro PDF Designer

export type WidgetType = 
  | 'text' 
  | 'variable' 
  | 'table' 
  | 'image' 
  | 'line' 
  | 'box' 
  | 'page-number'
  | 'date'
  | 'qr-code'
  | 'signature';

export type TableType = 
  | 'rozvadece' 
  | 'okruhy' 
  | 'zavady' 
  | 'mereni' 
  | 'pristroje'
  | 'mistnosti'
  | 'podklady'
  | 'custom';

export type PageZone = 'header' | 'content' | 'footer';

export type PageSize = 'a4' | 'a5' | 'letter';
export type PageOrientation = 'portrait' | 'landscape';

export interface WidgetStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  padding?: number;
  opacity?: number;
  lineHeight?: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: WidgetStyle;
  locked: boolean;
  zone: PageZone;
  pageId: string;
  zIndex: number;
  tableConfig?: TableConfig;
  groupId?: string;
}

export interface TableConfig {
  type: TableType;
  columns: TableColumn[];
  showHeader: boolean;
  headerStyle?: Partial<WidgetStyle>;
  rowStyle?: Partial<WidgetStyle>;
  alternateRowColor?: string;
  borderStyle: 'all' | 'horizontal' | 'vertical' | 'outer' | 'none';
}

export interface TableColumn {
  id: string;
  key: string;
  label: string;
  width: number; // procenta
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface PageTemplate {
  id: string;
  name?: string;
  size: PageSize;
  orientation: PageOrientation;
  widgets: Widget[];
}

export interface DesignerTemplate {
  id: string;
  name: string;
  description?: string;
  pages: PageTemplate[];
  headerHeight: number;
  footerHeight: number;
  gridSize: number;
  snapToGrid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Variable {
  key: string;
  label: string;
  category: string;
  description?: string;
  format?: 'text' | 'date' | 'number' | 'currency' | 'boolean';
}
