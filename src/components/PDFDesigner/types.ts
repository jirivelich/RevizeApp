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
  | 'signature'
  | 'repeater' // Opakující se skupina widgetů (např. pro rozvaděče)
  | 'page-break' // Zalomení stránky - vynucené přerušení na novou stránku
  | 'group'; // Kontejnerový widget - obsahuje další widgety jako děti

export type TableType = 
  | 'rozvadece' 
  | 'okruhy' 
  | 'zavady' 
  | 'mereni' 
  | 'pristroje'
  | 'mistnosti'
  | 'podklady'
  | 'zarizeni'
  | 'custom';

// Typy pro opakující se skupiny (repeater)
export type RepeaterType = 
  | 'rozvadece'  // Pro každý rozvaděč: info + tabulka okruhů
  | 'mistnosti'  // Pro každou místnost: info + zařízení
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
  repeaterConfig?: RepeaterConfig; // Pro typ 'repeater'
  groupId?: string; // DEPRECATED - použít children místo toho
  children?: Widget[]; // Pro typ 'group' - vnořené widgety s relativními pozicemi
  // Automatické stránkování
  autoGrow?: boolean; // Widget může přetékat na další stránky
  overflowBehavior?: 'clip' | 'continue' | 'shrink'; // Co dělat když obsah přetéká
  minHeight?: number; // Minimální výška (px) - pod tímto se přesune na novou stránku
}

export interface TableConfig {
  type: TableType;
  columns: TableColumn[];
  showHeader: boolean;
  headerStyle?: Partial<WidgetStyle>;
  rowStyle?: Partial<WidgetStyle>;
  alternateRowColor?: string;
  borderStyle: 'all' | 'horizontal' | 'vertical' | 'outer' | 'none';
  // Automatické stránkování tabulky
  rowsPerPage?: number; // Max řádků na stránku (0 = automaticky)
  repeatHeaderOnNewPage?: boolean; // Opakovat hlavičku na každé stránce
}

// Konfigurace pro opakující se skupinu (repeater)
// Např. pro rozvaděče: pro každý rozvaděč se zopakuje blok s info + tabulkou okruhů
export interface RepeaterConfig {
  type: RepeaterType;
  // Šablona widgetů uvnitř repeateru (relativní pozice)
  template: RepeaterItemTemplate[];
  // Mezera mezi jednotlivými instancemi (mm)
  gap: number;
  // Orientace opakování
  direction: 'vertical' | 'horizontal';
  // Zda začít každou instanci na nové stránce
  newPageForEach?: boolean;
  // Zobrazit oddělovač mezi instancemi
  showSeparator?: boolean;
  separatorStyle?: Partial<WidgetStyle>;
}

// Šablona položky uvnitř repeateru
export interface RepeaterItemTemplate {
  id: string;
  type: 'text' | 'variable' | 'table' | 'line' | 'box';
  name: string;
  // Relativní pozice v rámci repeateru (mm)
  relativeX: number;
  relativeY: number;
  width: number;
  height: number;
  style?: Partial<WidgetStyle>;
  // Pro variable - klíč s prefixem "item." pro data z aktuální položky
  // Např. "item.nazev" = rozvadec.nazev
  content?: string;
  // Pro table - tabulka filtrovaná podle parent ID
  tableConfig?: TableConfig & {
    // Filtr podle parent ID (např. okruhy pro daný rozvadecId)
    filterByParentId?: boolean;
    parentIdField?: string; // Např. "rozvadecId"
  };
  autoGrow?: boolean;
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
