# PDF Designer - Kompletní dokumentace

> **DŮLEŽITÉ:** Před každou změnou v souborech PDF Designeru si přečti tento soubor!

## Přehled souborů

| Soubor | Účel |
|--------|------|
| `PDFDesignerMain.tsx` | Hlavní komponenta designeru |
| `PageCanvas.tsx` | Plátno stránky s widgety |
| `WidgetRenderer.tsx` | Renderování obsahu widgetů |
| `WidgetEditor.tsx` | Modal pro editaci widgetu |
| `PropertiesPanel.tsx` | Boční panel vlastností |
| `Toolbar.tsx` | Horní toolbar s nástroji |
| `useDesignerState.ts` | Hlavní state hook |
| `types.ts` | TypeScript typy |
| `constants.ts` | Konstanty (proměnné, sloupce tabulek) |
| `pdfRenderer.ts` | Generování PDF (jsPDF) |
| `htmlRenderer.ts` | Generování HTML náhledu |
| `pdfVariables.ts` | Resolver proměnných |
| `paginationUtils.ts` | Utility pro stránkování |
| `defaultTemplates.ts` | Výchozí šablony |

---

## Architektura zón

### Tři zóny na stránce:
1. **Header (záhlaví)** - opakuje se na každé stránce
2. **Content (obsah)** - hlavní obsah, může přetékat na další stránky
3. **Footer (zápatí)** - opakuje se na každé stránce

### Rozměry (z šablony - v MM):
```typescript
headerHeight: 25  // mm - výška záhlaví
footerHeight: 20  // mm - výška zápatí
```

### Konverze:
```typescript
const pxPerMm = 3.78;  // 1mm ≈ 3.78px při 96dpi
const PX_TO_MM = 1 / 3.78;  // ≈ 0.2646

// Výpočty v PageCanvas:
headerZoneHeight = headerHeight * pxPerMm;  // 25 * 3.78 = 94.5px
footerZoneHeight = footerHeight * pxPerMm;  // 20 * 3.78 = 75.6px
contentZoneTop = headerZoneHeight;  // 94.5px
```

---

## Widget struktura

```typescript
interface Widget {
  id: string;
  type: WidgetType;  // 'text' | 'variable' | 'image' | 'line' | 'box' | 'table' | 'repeater' | 'group' | 'page-number' | 'date' | 'qr-code'
  name: string;
  content: string;
  x: number;      // px - relativní k zóně
  y: number;      // px - relativní k zóně
  width: number;  // px
  height: number; // px
  style: WidgetStyle;
  locked: boolean;
  zone: 'header' | 'content' | 'footer';
  pageId: string;
  zIndex: number;
  children?: Widget[];  // Pro typ 'group' - vnořené widgety
  tableConfig?: TableConfig;
  repeaterConfig?: RepeaterConfig;
}
```

---

## Renderování widgetů v PageCanvas

### Filtrování podle zón:
```typescript
const headerWidgets = widgets.filter(w => w.zone === 'header');
const contentWidgets = widgets.filter(w => w.zone === 'content');
const footerWidgets = widgets.filter(w => w.zone === 'footer');
```

### Renderování s offsety:
```typescript
// Header widgety - zoneTop = 0
{renderZoneWidgets(headerWidgets, 0)}

// Content widgety - zoneTop = headerZoneHeight (94.5px)
{renderZoneWidgets(contentWidgets, contentZoneTop)}

// Footer widgety - zoneTop = basePageHeight - footerZoneHeight
{renderZoneWidgets(footerWidgets, basePageHeight - footerZoneHeight)}
```

### Funkce renderZoneWidgets:
```typescript
const renderZoneWidgets = (zoneWidgets: Widget[], zoneTop: number) => {
  return zoneWidgets.map(widget => (
    <CanvasWidget
      key={widget.id}
      widget={{ ...widget, y: widget.y + zoneTop }}  // Y se přičítá
      onUpdate={(id, updates) => {
        if (updates.y !== undefined) {
          updates.y = updates.y - zoneTop;  // Y se odečítá zpět
        }
        onUpdateWidget(id, updates);
      }}
      // ...
    />
  ));
};
```

---

## Změna zóny widgetu

### KRITICKÉ: Při změně zóny musí být Y pozice přepočítána!

**Problém:** Pokud widget v content zóně má Y=300px a přesuneme ho do header zóny (výška 94.5px), widget "zmizí" protože je mimo viditelnou oblast.

### PropertiesPanel (řádky 275-310):
```typescript
onClick={() => {
  const newY = selectedWidget.y < 0 ? 10 : selectedWidget.y;
  onUpdateWidget(selectedWidget.id, { 
    zone: 'header', 
    y: Math.max(0, Math.min(newY, 50))  // Limit na max 50px
  });
}}
```

### WidgetEditor (řádky 277-294):
```typescript
onChange={(e) => {
  const newZone = e.target.value as 'header' | 'content' | 'footer';
  let newY = editedWidget.y;
  
  if (newZone === 'header' || newZone === 'footer') {
    newY = Math.min(newY, 50);  // Omezit Y pro malé zóny
  }
  if (editedWidget.zone !== 'content' && newZone === 'content') {
    newY = 10;  // Reset při přechodu do content
  }
  
  setEditedWidget({ ...editedWidget, zone: newZone, y: Math.max(0, newY) });
}}
```

---

## Skupiny (Groups)

### Vytvoření skupiny:
```typescript
// useDesignerState.ts - groupWidgets()
const groupWidget: Widget = {
  id: generateId(),
  type: 'group',
  name: `Skupina (${selectedWidgets.length} položek)`,
  x: minX,
  y: minY,
  width: maxX - minX,
  height: maxY - minY,
  children: selectedWidgets.map(w => ({
    ...w,
    x: w.x - minX,  // Relativní X
    y: w.y - minY,  // Relativní Y
  })),
  // ...
};
```

### Renderování skupiny (WidgetRenderer.tsx):
```typescript
case 'group': {
  const children = widget.children || [];
  return (
    <div style={{...}}>
      <div>📦 Skupina ({children.length})</div>
      {children.map((child) => (
        <div
          style={{
            position: 'absolute',
            left: child.x,
            top: child.y,
            pointerEvents: 'none',  // Děti nelze přímo vybrat
          }}
        >
          {renderWidgetContent({ widget: child, ... })}
        </div>
      ))}
    </div>
  );
}
```

### KRITICKÉ: Ukládání skupin s children!
```typescript
// PDFDesignerMain.tsx - serializeWidget()
const serializeWidget = (widget: Widget): any => {
  const serialized = { ...widget properties... };
  
  // Rekurzivně serializovat children pro skupiny
  if (widget.children && widget.children.length > 0) {
    serialized.children = widget.children.map(child => serializeWidget(child));
  }
  
  return serialized;
};
```

---

## State Management (useDesignerState.ts)

### Hlavní state:
```typescript
const [template, setTemplate] = useState<DesignerTemplate>(initialTemplate);
const [currentPageIndex, setCurrentPageIndex] = useState(0);
const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
const [scale, setScale] = useState(1);
const [showGrid, setShowGrid] = useState(true);
const [showZones, setShowZones] = useState(true);
```

### Klíčové funkce:
- `addWidget(type, zone)` - přidá nový widget
- `updateWidget(id, updates)` - aktualizuje widget
- `deleteWidget(id)` - smaže widget
- `duplicateWidget(id)` - duplikuje widget
- `groupWidgets()` - seskupí vybrané widgety
- `ungroupWidgets()` - rozeskupí skupinu
- `selectWidget(id, isMulti)` - vybere widget
- `updateTemplate(updates)` - aktualizuje šablonu

---

## Repeater widget

### Konfigurace:
```typescript
interface RepeaterConfig {
  type: 'rozvadece' | 'mistnosti' | 'zavady';
  showHeader: boolean;
  showFooter: boolean;
  gap: number;  // px - mezera mezi položkami
}
```

### Automatické stránkování:
- Repeater automaticky rozděluje obsah mezi stránky
- Funkce `checkPageBreak(neededMM)` kontroluje, zda se další položka vejde na stránku
- Pokud ne, posune se na začátek další stránky

---

## Ukládání šablon

### Do localStorage:
```typescript
const handleSaveTemplate = useCallback(() => {
  const templateToSave = {
    ...state.template,
    pages: state.template.pages.map(page => ({
      ...page,
      widgets: page.widgets.map(widget => serializeWidget(widget)),
    })),
  };
  
  localStorage.setItem('pdfDesignerTemplates', JSON.stringify(templates));
}, [...]);
```

---

## VAROVÁNÍ - Nerozbít!

### 1. Zóny
- ❌ Neměnit logiku filterování widgetů podle zón
- ❌ Neměnit výpočet zoneTop v renderZoneWidgets
- ❌ Nezapomenout přepočítat Y při změně zóny

### 2. Skupiny
- ❌ Neodstraňovat `children` property při serializaci
- ❌ Neměnit relativní pozice dětí ve skupině

### 3. Konverze jednotek
- ❌ Neměnit `pxPerMm = 3.78` a `PX_TO_MM = 1/3.78`
- ❌ Nezaměňovat px a mm

### 4. State
- ❌ Vždy používat immutable updates
- ❌ Neměnit přímo template - vždy přes updateTemplate

---

## Aktuální stav (22. ledna 2026)

### ✅ Fungující:
- Přidávání/mazání/editace widgetů
- Přetahování a resize widgetů
- Seskupování widgetů (Ctrl+G)
- Rozeskupování (Ctrl+Shift+G)
- Změna zóny s přepočtem Y
- Ukládání a načítání šablon (včetně children)
- HTML náhled s tiskem
- PDF export

### 🔧 Opraveno:
- Children se nyní ukládají při serializaci skupin
- Y pozice se přepočítává při změně zóny ve WidgetEditor
