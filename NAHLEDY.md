# Náhledy – generování revizních zpráv

Revizní zprávy se skládají ze **šablon** (HTML stránky A4), zobrazují se jako **„list A4 na stole“**
a exportují do **PDF**, **Wordu** a hromadně do **ZIPu**. Kód je ve složce `src/documents/`.

> Obsah zpráv (sekce, pořadí, číslování, `tiskSekce`, popisky) odpovídá dřívějším náhledům
> postaveným na Paged.js. Změnil se způsob skládání, stránkování a exportu.

---

## Architektura

```
URL: /revize/:id/nahled
        │
        ▼
  NahledRouter ── buildContext(id) ──► ctx (všechna data revize + helpery H)
        │
        ▼
  TPL.instances(ctx) ──► dokumenty podle kategorie revize a scope šablony
        │                 (render(ctx) → HTML s <div class="page" data-flow>…)
        ▼
  DocumentViewer
    ├─ paginate()  – rozdělí obsah na listy A4 (mimo obrazovku, bez zoomu)
    ├─ náhled      – tmavý „stůl“, zoom 0,4–1,2
    ├─ Tisk        – window.print() (vektorové PDF z prohlížeče)
    ├─ PDF         – html2canvas (scale 2) → jsPDF, JPEG přes celou A4
    ├─ Word        – stejné HTML → html-docx-js (altChunk), okraje ~2 cm
    └─ Vše (ZIP)   – všechny dokumenty revize jako PDF + DOCX (JSZip)
```

## Soubory

| Soubor | Účel |
|--------|------|
| `registry.ts` | `TPL.register({ id, name, scope, order, kategorie, render })`, `TPL.list()`, `TPL.instances(ctx)` |
| `context.ts` | `buildContext(revizeId)` načte data z DB; `createContext(data)` sestaví `ctx` |
| `helpers.ts` | `H.esc`, `H.d`, `H.v`, `H.vn`, `H.an`, `H.lines`, `H.paras`, `H.paginate`, `H.fileName` |
| `paginate.ts` | Stránkování na listy A4, opakovaná hlavička, patička „Strana X (celkem Y)“ |
| `doc.css` | Styly dokumentu pod `.doc-root` (Calibri/Carlito 11pt, tabulky) |
| `stul.css`, `DocumentViewer.tsx` | Náhled „stůl“ + toolbar |
| `export/pdf.ts`, `export/word.ts`, `export/zip.ts` | Exporty |
| `templates/common.ts` | Společné bloky (hlavička firmy, sekce, `kv`, `grid`, podpisy, závady, přílohy) |
| `templates/elektro.ts` | Zpráva elektro (record) + protokol měření pro každý rozvaděč (group) |
| `templates/hromosvod.ts`, `stroje.ts`, `odberneMisto.ts` | Zprávy ostatních kategorií |
| `fixtures.ts`, `DevSablony.tsx` | Vzorová data a vývojová stránka `/dev/sablony` (jen `npm run dev`) |

## Šablony

- `render(ctx)` vrací HTML string; šablona **čte jen z `ctx`**.
- Všechna uživatelská data přes `H.esc` nebo `H.v` (prázdná hodnota → tečkovaná linka pro ruční doplnění).
- Rozložení **jen tabulkami** (kvůli Wordu): `table.kv` (popisek/hodnota), `table.grid` (mřížka).
- `H.vn(stav, [a, b])` – vytiskne jen platnou variantu (např. „SCHOPNA“ nebo „NESCHOPNA“); nerozhodnuto = tečky k ručnímu doplnění.
- `scope`: `record` (1× na revizi), `group` (1× na prvek z `groups(ctx)`, např. rozvaděč), `all` (1× za celek).

### Pravidla stránkování (`paginate.ts`)

| Značka | Chování |
|--------|---------|
| `<div class="page" data-flow data-foot="…">` | Obsah se skládá na tolik listů, kolik potřebuje |
| `.page-head` (první potomek) | Opakuje se na každém listu |
| `table` | Dělí se po řádcích, `<thead>` se opakuje; na listu min. 2 řádky |
| `.split` | Dělí se po potomcích (sekce, seznamy) |
| `.keep` | Nadpis – nezůstane sám na konci listu |
| `.nosplit` | Nikdy se nedělí (podpisy, výsledek) |
| `<div class="pb"></div>` | Vynucený nový list |

## Ověření

- Testy: `src/__tests__/documents/` (helpery, obsah šablon, escapování, `tiskSekce`, číslování).
- Vizuálně: `npm run dev` → `http://localhost:5173/dev/sablony?k=elektro` (`k` = `elektro` | `hromosvod` | `stroje` | `odberne_misto`, `&empty=1` = prázdná data). Přetečený list se zvýrazní červeně.

## Známá omezení

- **PDF z tlačítka „PDF“** je obrázkové (html2canvas) – text nejde označit. Pro textové PDF použijte **Tisk → Uložit jako PDF**.
- **Word** (html-docx-js / altChunk) otevře desktopový **Microsoft Word**; LibreOffice a Google Docs altChunk nezobrazí.
- Word stránky přeskládává sám – zalomení odpovídá náhledu, ale patička je na konci obsahu stránky.
