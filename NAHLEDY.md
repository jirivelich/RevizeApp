# Náhledy – Tiskový náhled revizních zpráv

Dokumentace systému tiskových náhledů (preview) a exportů revizních zpráv.

---

## Architektura

```
URL: /revize/:id/nahled
        │
        ▼
  ┌─────────────────┐
  │  NahledRouter    │ ← revizeService.getById(id) → kategorieRevize
  └────────┬────────┘
           │
    ┌──────┼──────────┐
    ▼      ▼          ▼
  Elektro  Hromosvod  Stroje
    │         │         │
    ▼         ▼         ▼
  loadAllData()  ← DB services (revize, závady, přístroje, nastavení...)
    │
    ▼
  React render → sourceRef (skrytý div, 210mm šířka)
    │
    ▼
  runPagedjs() → Previewer.preview() → previewRef (viditelné A4 stránky)
    │
    └─ window.print()  → PDF / tiskárna
```

### Přístup

- **Route:** `/revize/:id/nahled` (chráněno `<ProtectedRoute>`)
- Vstupní bod: `NahledRouter` (`src/pages/NahledRouter.tsx`)

### Routing podle kategorie revize

| kategorieRevize | Komponenta | Popis |
|-----------------|-----------|-------|
| `'elektro'` (výchozí) | `<ReportPrintPage />` | Elektro revize |
| `'hromosvod'` | `<HromosvodPrintPage />` | Hromosvod / LPS |
| `'stroje'` | `<StrojniZarizeniPrintPage />` | Strojní zařízení |

---

## Společný mechanismus – Pagedjs

Všechny tři náhledy sdílejí stejný renderovací postup:

1. React vykreslí obsah do **skrytého** `<div ref={sourceRef}>` (pozicováno mimo viewport)
2. Po vyrenderování se spustí `runPagedjs()`:
   - Klonuje obsah ze `sourceRef`
   - Sbírá CSS pravidla obsahující `.report-` nebo `.pagedjs_` prefix
   - Kombinuje je s `PAGED_CSS` (JS string s `@page` margin-box pravidly)
   - Vytváří Blob URL pro CSS a volá `new Previewer().preview(content, [cssUrl], previewRef)`
3. Výsledek: **stránkovaný A4 náhled** s hlavičkami/patičkami v `<div ref={previewRef}>`
4. **Fallback** při chybě: klonuje innerHTML přímo, odhaduje stránky z výšky (980px ≈ A4)

### @page definice

- **Velikost:** A4
- **Okraje:** 18mm top, 15mm left/right, 20mm bottom
- **Hlavička vlevo:** číslo zprávy (černá, bold, 8pt) – přes CSS `string-set`
- **Hlavička vpravo:** název firmy + adresa
- **Patička uprostřed:** „Strana X / Y"
- **Patička vlevo:** název firmy
- **Patička vpravo:** typ zprávy (liší se dle kategorie)
- **První strana:** prázdné hlavičky

---

## Sdílené komponenty

Všechny tři print pages používají komponenty z `src/pages/ReportPrint/`:

| Komponenta | Props | Účel |
|-----------|-------|------|
| `ReportHeader` | `{ nastaveni, revize }` | Logo, název firmy, adresa, IČO, DIČ, telefon, email, číslo zprávy, datum |
| `ReportSection` | `{ title, children }` | Pojmenovaná sekce s černým nadpisem a silver linkou |
| `ReportTable` | `{ columns, widths?, rows }` | Datová tabulka s šedým záhlavím a zebra řádky |

---

## 1) Elektro revize – `ReportPrintPage`

**Umístění:** `src/pages/ReportPrint/`

### Soubory

| Soubor | Účel |
|--------|------|
| `index.ts` | Re-export |
| `ReportPrintPage.tsx` | Hlavní komponenta (~658 řádků) |
| `ReportHeader.tsx` | Hlavička s logem firmy |
| `ReportSection.tsx` | Opakovaně použitelná sekce |
| `ReportTable.tsx` | Datová tabulka |
| `print.css` | Tiskové styly (~340 řádků) |

### Data

```typescript
export interface ReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  rozvadece: RozvadecWithOkruhy[];
  zavady: Zavada[];
  mistnosti: MistnostWithZarizeni[];
  pristroje: MericiPristroj[];
}
```

#### Načítání dat

1. `revizeService.getById(id)` → objekt revize
2. Paralelně (`Promise.all`):
   - `rozvadecService.getByRevize(id)` → rozvaděče
   - `zavadaService.getByRevize(id)` → závady
   - `mistnostService.getByRevize(id)` → místnosti
   - `revizePristrojService.getByRevize(id)` → měřicí přístroje
   - `nastaveniService.get()` → nastavení firmy/technika
3. Pro každý rozvaděč: `okruhService.getByRozvadec(roz.id)` → okruhy
4. Pro každou místnost: `zarizeniService.getByMistnost(m.id)` → zařízení
5. Pokud `revize.zakaznikId`: načtení zákazníka

### Sekce zprávy

| # | Sekce | tiskSekce klíč | Podmínka |
|---|-------|---------------|----------|
| — | Záhlaví s logem a číslem zprávy | — | vždy |
| — | Normy / soulad | — | vždy |
| 1 | Provozovatel (objednatel) | — | vždy |
| 2 | Identifikace objektu | — | vždy |
| 3 | Revizní technik | — | vždy |
| 4 | Data a termíny | — | vždy |
| 5 | Vyhodnocení (výsledek) | — | vždy |
| 6 | Podpisy | — | vždy |
| — | *ZALOMENÍ STRÁNKY* | — | — |
| 7 | Popis revidovaného zařízení | `popisZarizeni` | `revize.popisZarizeni` existuje |
| 8 | Vymezení rozsahu revize | `rozsahRevize` | — |
| — | Charakteristika zařízení | `charakteristika` | napětí/ochrana existuje |
| 9 | Soupis měřicích přístrojů | `pristroje` | — |
| 10 | Podklady | `podklady` | — |
| 11 | Provedené úkony | `provedeneUkony` | — |
| 12 | Rozvaděče a okruhy (naměřené hodnoty) | — | vždy |
| — | Místnosti a zařízení | — | `mistnosti.length > 0` |
| 13 | Přehled zjištěných závad | — | vždy |
| 14 | Vyhodnocení předchozích revizí | `vyhodnoceniPredchozich` | — |
| 15 | Lhůta příští revize | — | vždy |
| 16 | Odůvodnění | `vysledekOduvodneni` | text existuje |
| 17 | Závěr | `zaver` | text existuje |

### Mechanismus tiskSekce

Revize má pole `tiskSekce` (JSON string), např. `{"podklady": false, "pristroje": true}`.
Funkce `isSekceVisible(key)` vrací `true` jako výchozí – sekce se skryje jen při explicitním `false`.

### Ochrana před úrazem

JSON pole klíčů (`['zakladni-izolace', 'selv', ...]`) mapovaných na české popisky přes lookup tabulku `ochranaLabels`.

### Toolbar

Sticky horní lišta (skrytá při tisku): tlačítko Zpět, číslo revize, Tisk/PDF, počet stran.

---

## 2) Hromosvod – `HromosvodPrintPage`

**Umístění:** `src/pages/HromosvodPrint/`

### Soubory

| Soubor | Účel |
|--------|------|
| `index.ts` | Re-export |
| `HromosvodPrintPage.tsx` | Hlavní komponenta |

### Data

```typescript
export interface HromosvodReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
}
```

**Rozdíl:** nenačítá rozvaděče, okruhy, místnosti, zařízení (specifické pro elektro).

Specifický typ pro měření:
```typescript
interface MereniOdporu {
  bod: string;
  hodnota: string;
  limit: string;
  vyhovuje: boolean;
}
```
Data parsovaná z `revize.hromosvodMereniOdporu` (JSON string).

### Sekce zprávy (19 sekcí)

| # | Sekce | tiskSekce klíč |
|---|-------|---------------|
| 1 | Provozovatel | — |
| 2 | Identifikace objektu | — |
| 3 | Charakteristika LPS (třída, typ, rok, popis) | — |
| 4 | Rozsah revize | `rozsahRevize` |
| 5 | Revizní technik | — |
| 6 | Druh revize | — |
| 7 | Důležitá data | — |
| 8 | Jímací soustava (typ, materiál, stav) | `jimaciSoustava` |
| 9 | Svodové vedení (počet, materiál, průřez, svorky, stav) | `svodoveVedeni` |
| 10 | Uzemňovací soustava (typ, materiál, stav) | `uzemnovaciSoustava` |
| 11 | Ochranné pospojování / SPD | `spd` |
| 12 | Měření odporů uzemnění (tabulka + statistiky) | `mereniOdporu` |
| 13 | Měřicí přístroje | `pristroje` |
| 14 | Podklady | `podklady` |
| 15 | Vyhodnocení předchozích | `vyhodnoceniPredchozich` |
| 16 | Závady | — |
| 17 | Závěrečné zhodnocení + závěr | `zaver` |
| 18 | Lhůta příští revize | — |
| 19 | Podpisy | — |

### Pomocné funkce

| Funkce | Účel |
|--------|------|
| `stavLabel(stav)` | Mapuje stav na český popis |
| `stavPrintColor(stav)` | Zelená / červená / žlutá / šedá barva |
| `tridaLpsLabel(trida)` | Třídy I–IV s popisem |
| `typOchranyLabel(typ)` | Vnější / vnitřní / kombinovaná |

### Toolbar

- Toolbar badge: „Hromosvod" (amber)
- `@bottom-right`: „Revizní zpráva – Hromosvod"

---

## 3) Strojní zařízení – `StrojniZarizeniPrintPage`

**Umístění:** `src/pages/StrojniZarizeniPrint/`

### Soubory

| Soubor | Účel |
|--------|------|
| `index.ts` | Re-export |
| `StrojniZarizeniPrintPage.tsx` | Hlavní komponenta |
| `types.ts` | Datové typy + výchozí hodnoty (~218 řádků) |
| `strojniZarizeni.css` | Formulářový styl (industriální design) |

### Data

```typescript
export interface StrojniReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
  strojniData: StrojniFormData | null;
}
```

#### StrojniFormData (z `revize.strojniData` JSON)

```typescript
interface StrojniFormData {
  strojNazev, strojSn, strojVyrobce, strojRok: string;
  strojNapajeni, strojPrikon, strojProud, strojIp: string;
  strojTrida, strojCe, mistoHala: string;
  jisteni: JisteniRow[];      // prvky jištění
  izolace: IzolaceRow[];      // izolační odpor
  spojitost: SpojitostRow[];  // spojitost PE
  rcd: RcdRow[];              // proudové chrániče
  kontroly: KontrolaRow[];    // funkční kontroly
  pristroje: PristrojRow[];   // přístroje (inline tabulka)
  verdikt: '' | 'pass' | 'fail';
  posudekZavady, posudekDoporuceni, posudekNormy: string;
}
```

### Výchozí hodnoty (types.ts)

| Konstanta | Popis |
|-----------|-------|
| `DEFAULT_JISTENI` | 5 řádků: Hlavní jistič, Motorový spouštěč, RCD, SPD, Jiné |
| `DEFAULT_IZOLACE` | 5 řádků: L1-L3→PE, Řídicí, Bezpečnostní, Topné, Jiné |
| `DEFAULT_SPOJITOST` | 4 řádky: Rozvaděč→kostra, Kostra→pohyblivé, Kostra→motor, Jiné |
| `DEFAULT_RCD` | 3 řádky: RCD 1–3 |
| `KONTROLY_LABELS` | 14 položek: STOP, bezpečnostní relé, kryty, SPD, signalizace... |
| `DEFAULT_PRISTROJE` | 3 prázdné řádky |
| `createDefaultFormData()` | Factory s výchozí normou „ČSN EN 60204-1, zákon č. 250/2021 Sb." |

### Sekce zprávy (15 sekcí)

| # | Sekce | Podmínka |
|---|-------|---------|
| 1 | Provozovatel | vždy |
| 2 | Místo ověření (adresa + hala) | vždy |
| 3 | Identifikace stroje – štítek (2-sloupcová tabulka) | `strojniData` existuje |
| 4 | Revizní technik | vždy |
| 5 | Důležitá data (+ `lhutaText`) | vždy |
| 6 | Jištění strojního zařízení | `jisteniRows.length > 0` |
| 7 | Měření izolačního odporu | `izolaceRows.length > 0` |
| 8 | Měření spojitosti PE | `spojitostRows.length > 0` |
| 9 | Měření RCD | `rcdRows.length > 0` |
| 10 | Funkční kontroly | `kontrolyRows.length > 0` |
| 11 | Měřicí přístroje (z revize NEBO inline dat) | vždy |
| 12 | Závady (+ posudekZavady + posudekDoporuceni) | vždy |
| 13 | Vyhodnocení (pass/fail + disclaimer NV 378/2001) | vždy |
| 14 | Lhůta příštího ověření | vždy |
| 15 | Podpisy | vždy |

### Filtrování řádků

- Řádky se stavem `'NA'` se v náhledu **nezobrazují**
- Prázdné řádky (bez názvu/hodnoty) se přeskakují

### Rozdíly od ostatních

- **Nemá toolbar** (žádné tlačítko Zpět/Print v komponentě)
- `@bottom-right`: „Zpráva o revizi elektrické instalace strojního zařízení"

### strojniZarizeni.css – Formulářový design

- **Font:** IBM Plex Sans + IBM Plex Mono
- **Barevný motiv:** industriální – rust-orange accent (`#c84b2f`), zelená (`#4a7c59`)
- **Grid layouty:** `sz-cols-2/3/4`
- **Check buttons:** V (vyhovuje) / N (nevyhovuje) / NA se zvýrazněním
- **Verdict buttons:** pass (zelená) / fail (červená)
- **@media print:** skryje toolbar a tlačítka, odstraní ohraničení u inputů

---

## Styly – print.css

**Umístění:** `src/pages/ReportPrint/print.css` (~340 řádků)

### Hlavní CSS třídy

| Třída | Účel |
|-------|------|
| `.report-print-bg` | Šedé pozadí stránky (slate-200) |
| `.report-source` | Skrytý zdroj (absolute, left:-9999px) |
| `.report-preview` | Container pro pagedjs výstup |
| `.report-string-*` | String-set prvky (height:0, overflow:hidden) |
| `.report-page` | Hlavní content – Segoe UI, 10pt, line-height 1.45 |
| `.report-header*` | Flexbox hlavička s logem |
| `.report-title` | 22pt, uppercase, bold |
| `.report-section*` | Sekce s černým nadpisem a silver linkou |
| `.report-subsection*` | Podsekce (šedý bg, silver levý pruh) |
| `.report-info-table` | Key-value tabulky (160px label width) |
| `.report-data-table` | Datové tabulky (šedý header, zebra rows) |
| `.report-result` | Box s výsledkem a rámečkem |
| `.report-signatures` | Podpisy (flex, 2 boxy) |
| `.report-page-break` | `break-before: page` |
| `.report-page-1 *` | Kompaktní styly pro 1. stranu |
| `.pagedjs_page` | Bílé pozadí, stín, centrování |

### @media print

- `.report-source` → `display: none`
- Bílé pozadí, žádné stíny
- Zachování barev v tabulkách (`print-color-adjust: exact`)

---

## Sdílené závislosti

| Knihovna | Účel | Použití |
|---------|------|--------|
| **pagedjs** (`Previewer`) | Stránkování HTML na A4 s margin boxy | Všechny 3 print pages |
| **react-router-dom** | URL parametry, navigace | NahledRouter, print pages |
| **services/database** | CRUD služby přes API | Načítání dat v komponentách |
