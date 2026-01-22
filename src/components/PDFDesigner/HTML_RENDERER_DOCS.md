# HTML Renderer - Dokumentace pro náhled

> **DŮLEŽITÉ:** Před každou změnou v `htmlRenderer.ts` si přečti tento soubor!
> **Aktualizováno:** 22. ledna 2026

## Účel souboru

Soubor `htmlRenderer.ts` generuje HTML náhled PDF šablony, který lze také vytisknout.
Každá stránka je renderována jako samostatný `<div class="print-page">` pro správné rozdělení při tisku.

---

## Klíčové konstanty

```typescript
const PX_TO_MM = 1 / 3.78;  // ≈ 0.2646 - převod z px (designer) na mm (HTML)
```

### Rozměry A4:
- **Na výšku (portrait):** 210mm × 297mm
- **Na šířku (landscape):** 297mm × 210mm

### Výchozí hodnoty:
- Header výška: 25mm
- Footer výška: 20mm
- Content začíná na: headerHeightMM (25mm)
- Content končí na: pageHeightMM - footerHeightMM (297-20 = 277mm)
- **Page gap (záhlaví + zápatí):** 45mm

---

## Architektura - Dvouprůchodový algoritmus

### Klíčové koncepty

#### Virtuální stránky
- Designer může mít jednu dlouhou stránku, ale tisková stránka má max 297mm
- **Virtuální stránka** = `Math.floor(absoluteYMM / pageHeightMM)`
- Widget na Y=400mm je na virtuální stránce 1 (400/297 = 1.35 → floor = 1)

#### RepeaterInfo - sledování růstu
```typescript
interface RepeaterInfo {
  pageIndex: number;        // Stránka designeru (0-based)
  originalStartYMM: number; // Kde repeater začíná
  originalEndYMM: number;   // Kde repeater končí v designeru
  actualEndYMM: number;     // Kde repeater skutečně končí (s daty)
}
```

### FÁZE 1: První průchod - Repeatery

1. Projít všechny widgety seřazené podle Y
2. Pro repeatery:
   - Spočítat absolutní pozici: `pageIndex * pageHeightMM + headerHeightMM + widget.y * PX_TO_MM`
   - Vygenerovat elementy pomocí `generateRepeaterElements()`
   - Zaznamenat růst: `growth = actualEndYMM - originalEndYMM`
   - Přidat do `cumulativeGrowth`

```typescript
for (const { widget, pageIndex } of sortedWidgets) {
  if (widget.type === 'repeater') {
    const originalEndYMM = pageStartMM + headerHeightMM + (widget.y + widget.height) * PX_TO_MM;
    const result = generateRepeaterElements(...);
    const growth = result.endYMM - (originalEndYMM + cumulativeGrowth);
    
    repeaterInfos.push({ pageIndex, originalStartYMM, originalEndYMM, actualEndYMM });
    cumulativeGrowth += growth;
  }
}
```

### FÁZE 2: Druhý průchod - Běžné widgety

1. Pro každý widget (kromě repeaterů):
   - Spočítat absolutní pozici
   - Spočítat virtuální stránku: `widgetVirtualPage = Math.floor(originalYMM / pageHeightMM)`
   - Aplikovat offset z repeaterů + kompenzaci za virtuální stránky

```typescript
let offsetMM = 0;
for (const ri of repeaterInfos) {
  if (originalYMM >= ri.originalEndYMM) {
    // Widget je ZA repeaterem - přidat růst
    offsetMM += growth;
    
    // Kompenzovat mezeru mezi virtuálními stránkami
    const repeaterEndVirtualPage = Math.floor(ri.originalEndYMM / pageHeightMM);
    if (widgetVirtualPage > repeaterEndVirtualPage) {
      const virtualPagesBetween = widgetVirtualPage - repeaterEndVirtualPage;
      offsetMM -= virtualPagesBetween * (pageGapMM + 9); // 54mm na stránku
    }
  }
}
```

### Kompenzace mezery mezi stránkami

**Problém:** Widgety na různých virtuálních stránkách designeru by v náhledu měly být blízko sebe, ale mají mezi sebou záhlaví/zápatí.

**Řešení:**
- Zjistit kolik virtuálních stránek je mezi koncem repeateru a widgetem
- Odečíst `pageGapMM + 9` (54mm) za každou stránku mezi nimi
- Výsledná mezera mezi widgety: **10mm**

---

## Hlavní funkce

### `renderTemplateToHTML(template, data): string`
Hlavní funkce - generuje kompletní HTML všech stránek.

**Vstup:**
- `template: DesignerTemplate` - šablona s pages a widgets
- `data: PDFRenderData` - data pro proměnné (revize, rozvadece, okruhy, mistnosti, zarizeni)

**Výstup:** HTML string s kontejnerem a všemi stránkami

### `generateRepeaterElements(widget, data, xMM, widthMM, pageHeightMM, contentStartMM, contentEndMM, absoluteStartYMM)`
Generuje elementy pro repeater (rozvaděče s okruhy, nebo místnosti se zařízeními).

**Logika page-break:**
```typescript
const checkPageBreak = (neededMM: number) => {
  const currentPage = Math.floor(currentYMM / pageHeightMM);
  const yOnPage = currentYMM - currentPage * pageHeightMM;
  
  if (yOnPage + neededMM > contentEndMM) {
    // Přesunout na další stránku
    const nextPage = currentPage + 1;
    currentYMM = nextPage * pageHeightMM + contentStartMM;
  }
};
```

**Vrací:** `{ elements: PositionedElement[], endYMM: number }`

### `renderWidgetAtPosition(widget, data, xMM, yMM): { html: string }`
Renderuje jednotlivý widget na danou pozici.

**Podporované typy widgetů:**
- `text` - text s proměnnými
- `variable` - hodnota proměnné
- `page-number` - číslo stránky ({page} / {pages})
- `date` - aktuální datum
- `line` - vodorovná čára
- `box` - obdélník s pozadím/ohraničením
- `image` - obrázek (data URL nebo placeholder)
- `group` - skupina widgetů (rekurzivně renderuje děti)

### `openHTMLPreview(template, data): void`
Otevře HTML náhled v novém okně prohlížeče.

---

## CSS pro tisk

```css
@page {
  size: ${pageWidthMM}mm ${pageHeightMM}mm;
  margin: 0;
}

@media print {
  body { 
    background: white !important; 
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .html-preview-container {
    padding: 0 !important;
    background: white !important;
    gap: 0 !important;
  }
  .print-page {
    box-shadow: none !important;
    page-break-after: always !important;
    break-after: page !important;
    margin: 0 !important;
  }
  .print-page:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .page-separator {
    display: none !important;
  }
}
```

---

## Rozměry elementů

### Repeater - rozvaděče:
- `headerMM = 7` - záhlaví rozvaděče (modrý pruh)
- `infoMM = 7` - info řádek (umístění, typ, krytí)
- `tableHeaderMM = 6` - záhlaví tabulky okruhů
- `rowMM = 5` - jeden řádek tabulky
- `emptyMsgMM = 6` - zpráva "Žádné okruhy"
- `gapMM = config.gap * PX_TO_MM` - mezera mezi rozvaděči

### Repeater - místnosti:
- Stejné rozměry jako rozvaděče
- Zelená barva místo modré

---

## Escape HTML

```typescript
function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

## Důležité závislosti

```typescript
import type { DesignerTemplate, Widget } from './types';
import type { PDFRenderData } from './pdfVariables';
import { getVariableValue, resolveVariables } from './pdfVariables';
import { TABLE_COLUMNS, PAGE_SIZES } from './constants';
```

---

## Struktura výstupu

```html
<div class="html-preview-container">
  <div class="print-page">
    <!-- header widgety -->
    <!-- content elementy pro stránku 1 -->
    <!-- footer widgety -->
  </div>
  <div class="page-separator"></div>
  <div class="print-page">
    <!-- header widgety -->
    <!-- content elementy pro stránku 2 -->
    <!-- footer widgety -->
  </div>
  <!-- atd. -->
</div>
```

---

## Aktuální stav (22. ledna 2026)

- ✅ Náhled zobrazuje stránky s čárkovanými oddělovači
- ✅ Tisk rozděluje stránky správně (page-break-after)
- ✅ Header a footer se opakují na každé stránce
- ✅ Repeater obsah se správně rozděluje mezi stránky
- ✅ Barvy se tisknou správně (print-color-adjust: exact)
- ✅ Skupiny (group) se renderují správně - děti jsou viditelné
- ✅ Rekurzivní renderování vnořených skupin
- ✅ Widgety za repeaterem se správně posouvají (cumulativeYOffsetMM)

---

## VAROVÁNÍ - Nerozbít!

1. **Nepřesouvat** logiku page-break z `generateRepeaterElements`
2. **Neměnit** strukturu `<div class="print-page">` - tisk na tom závisí
3. **Neodstraňovat** `page-break-after: always` z CSS
4. **Zachovat** přepočet relativní Y pozice v FÁZI 3
5. **Nerozbít** funkci `escapeHtml` - chrání před XSS
6. **Zachovat** rekurzivní renderování dětí v `case 'group'`

---

## Renderování skupin (group)

```typescript
case 'group': {
  const children = widget.children || [];
  if (children.length === 0) {
    return { html: '' }; // Prázdná skupina - nic nerenderovat
  }
  
  // Renderovat každé dítě na jeho relativní pozici uvnitř skupiny
  const childrenHtml = children.map(child => {
    const childXMM = xMM + child.x * PX_TO_MM;  // Absolutní X = skupina X + dítě X
    const childYMM = yMM + child.y * PX_TO_MM;  // Absolutní Y = skupina Y + dítě Y
    return renderWidgetAtPosition(child, data, childXMM, childYMM).html;
  }).join('\n');
  
  return { html: childrenHtml };
}
```

**Klíčové body:**
- Děti mají relativní pozice (x, y) vůči skupině
- Při renderování se přičte pozice skupiny k pozici dítěte
- Rekurzivní volání `renderWidgetAtPosition` umožňuje vnořené skupiny
- Prázdné skupiny vrací prázdný string (žádný rámeček)
