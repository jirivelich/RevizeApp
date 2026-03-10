# Code Review — RevizeApp

_Datum: 5. března 2026_

---

## 🔴 VYSOKÁ PRIORITA

### 1. BEZPEČNOST: SQL Injection přes dynamické názvy sloupců
**Soubory:** `server/server.ts` — všechny PUT endpointy kromě `/api/revize/:id`

Všechny PUT endpointy sestavují SQL z klíčů `req.body` přímo — **bez whitelistu povolených sloupců**:

```ts
const keys = Object.keys(req.body);    // ← přímo od klienta
const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
await pool.query(`UPDATE rozvadec SET ${setClause} WHERE id = ...`, [...values, id]);
```

Hodnoty jsou parametrizované (dobře), ale **názvy sloupců pocházejí přímo z uživatelského vstupu**. Pouze endpoint `PUT /api/revize/:id` má `allowedColumns` whitelist. Zbylých ~10 PUT endpointů (rozvadece, okruhy, mistnosti, zarizeni, zavady, firmy, zakazky, pristroje, zakaznici, nastaveni, zavady-katalog) tento whitelist nemá.

**Doporučení:** Přidat `allowedColumns` whitelist do **každého** PUT endpointu.

---

### 2. BEZPEČNOST: Hardcoded JWT secret
**Soubor:** `server/auth.ts`

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

V produkci, pokud není nastavena enviromentální proměnná, se použije pevný tajný klíč. Jakýkoliv útočník, který zná zdrojový kód, může podvrhnout validní JWT tokeny.

**Doporučení:** Vyhodit fallback; pokud `JWT_SECRET` není nastavený, vyhodit chybu a zastavit server.

---

### 3. BEZPEČNOST: Výchozí admin přihlašovací údaje
**Soubor:** `server/database.ts`

```ts
const hashedPassword = bcrypt.hashSync('admin123', 10);
await client.query(`INSERT INTO users ...`, ['admin', hashedPassword, ...]);
```

Výchozí uživatel `admin / admin123` se vytváří automaticky. V produkci to umožňuje okamžitý přístup komukoli.

**Doporučení:** Generovat náhodné heslo a zobrazit ho pouze v logu při prvním startu, nebo vyžadovat setup.

---

### 4. ✅ VÝKON: RevizeDetailPage — 2350 řádků, ~30 state proměnných
**Soubor:** `src/pages/RevizeDetail/` (dříve `src/pages/RevizeDetailPage.tsx`)

**VYŘEŠENO** — Monolitický komponent (2350 řádků) byl rozdělen do 10 souborů ve složce `src/pages/RevizeDetail/`:
- `RevizeDetailPage.tsx` (~200 řádků) — hlavní komponenta: routing, loadData, handleSave, tab bar, save bar
- `InfoTab.tsx` — záložka Základní údaje (sekce 1–5)
- `DokumentaceTab.tsx` — záložka Revidované zařízení (dokumentace, přístroje, sekce s tisk-toggle)
- `RozvadeceTab.tsx` — záložka Rozvaděče + okruhy (CRUD, drag-drop, modály)
- `ZavadyTab.tsx` — záložka Závady (CRUD, katalog, fotky, lightbox)
- `MistnostiTab.tsx` — záložka Místnosti + zařízení (CRUD, modály)
- `SekceHeader.tsx` — extrahovaná komponenta (dříve inline, re-vytvářena každým renderem)
- `PredvolenyTextBtn.tsx` — extrahovaná komponenta s čistým `value`/`onChange` API
- `constants.ts` — `PREDVOLENE_TEXTY` konstanty
- `index.ts` — re-export

---

### 5. VÝKON: N+1 query pattern v loadData
**Soubor:** `src/pages/RevizeDetailPage.tsx`

```ts
for (const roz of rozvadeceData) {
  if (roz.id) {
    const okruhyRoz = await okruhService.getByRozvadec(roz.id);
    counts[roz.id] = okruhyRoz.length;
  }
}
```

Pro 10 rozvaděčů = 10 separátních HTTP požadavků. Stejný pattern se opakuje pro zařízení v místnostech. Totéž na backendu — 10 separátních SQL dotazů.

**Doporučení:** Vytvořit batch endpoint (např. `GET /api/rozvadece/:revizeId/counts`) nebo vrátit počty okruhů rovnou v odpovědi rozvaděčů pomocí SQL JOIN.

---

### 6. VÝKON: Dashboard načítá VŠECHNA data pro statistiky
**Soubor:** `src/pages/Dashboard.tsx`

```ts
const revize = await revizeService.getAll();
const pristroje = await pristrojService.getAll();
const zakazky = await zakazkaService.getAll();
```

Stáhne komplet všechny revize, přístroje a zakázky jen pro výpočet 4 čísel. S 1000+ záznamy to bude pomalé.

**Doporučení:** Vytvořit server-side endpoint `GET /api/dashboard/stats` s SQL `COUNT()` a `WHERE`.

---

### 7. CHYBĚJÍCÍ ERROR HANDLING: Dashboard
**Soubor:** `src/pages/Dashboard.tsx`

`loadData` funkce nemá **žádný** `try/catch`, **žádný** loading stav. Při chybě API celá stránka selže tiše.

**Doporučení:** Přidat loading state, error state a try/catch obalení.

---

### 8. MRTVÝ KÓD: Duplikátní API soubory
**Soubory:** `src/services/api.ts` vs `src/services/database.ts`

Dva soubory dělají totéž — oba definují `getAuthHeaders()`, `handleResponse()`, a volají backend API. Pouze `database.ts` se skutečně používá v komponentách. `api.ts` (150 řádků) je pravděpodobně mrtvý kód.

Navíc v `api.ts` má `backupApi.download()` chybějící auth headers.

**Doporučení:** Smazat `api.ts` nebo sjednotit oba soubory.

---

### 9. ✅ STAV MANAGEMENT: Žádné cachování dat
~~Všechen data fetching používá raw `useState` + `useEffect`. Žádný React Query, SWR ani Context pro sdílení/cachování dat. Každý přechod mezi stránkami = kompletní re-fetch všech dat.~~

**Vyřešeno:** Zavedeno `@tanstack/react-query` s kompletní infrastrukturou:
- `QueryClientProvider` v `App.tsx` (staleTime 30s, gcTime 5min)
- Centrální query klíče v `src/hooks/queryKeys.ts`
- 40+ custom hooks v `src/hooks/useQueries.ts` (useRevize, useFirmy, usePristroje, useZakaznici, useZakazky, useNastaveni, usePredvoleneTexty, useZavadyKatalog, useDatabaseStats + všechny mutace s automatickou invalidací cache)
- Refaktorovány všechny stránky: Dashboard, RevizePage, FirmyPage, PristrojePage, ZavadyPage, ZakazniciPage, PlanovaniPage, MistnostiPage, RozvadecDetailPage, NastaveniPage, RevizeDetailPage
- Sdílená cache mezi stránkami (firmy, zákazníci, přístroje, nastavení, katalog závad)

---

## 🟡 STŘEDNÍ PRIORITA

### 10. UX: Žádné varování při neuložených změnách
**Soubor:** `src/pages/RevizeDetailPage.tsx`

Uživatel může ztratit všechny změny navigací pryč. Save tlačítko je viditelné pouze na záložkách info/dokumentace. Žádný `beforeunload` handler, žádný `useBlocker` z react-router.

**Doporučení:** Přidat `useBlocker` hook a `beforeunload` event listener.

---

### 11. UX: Primitivní validace formulářů

| Problém | Soubory |
|---------|---------|
| Žádná validace formátu IČO (8 číslic) | `FirmyPage.tsx`, `ZakazniciPage.tsx` |
| Žádná validace emailu ve formulářích | Všechny stránky s email polem |
| Žádná validace minimální délky hesla | `LoginPage.tsx` |
| `window.confirm()` pro mazání | Všechny stránky — ošklivé, blokuje vlákno |

**Doporučení:** Zavést validační knihovnu (zod + react-hook-form) a nahradit `window.confirm` custom modálem.

---

### 12. BACKEND ARCHITEKTURA: Celý server v jednom souboru (1167 řádků)
**Soubor:** `server/server.ts`

Všechny CRUD endpointy pro ~15 entit v jednom souboru. Velmi obtížná údržba.

**Doporučení:** Použít `express.Router()` a rozdělit do souborů: `routes/revize.ts`, `routes/rozvadece.ts`, `routes/zavady.ts`, atd.

---

### 13. DATABÁZE: Datumy ukládány jako TEXT
**Soubor:** `server/database.ts`

```sql
"createdAt" TEXT NOT NULL,
"updatedAt" TEXT NOT NULL
```

Všechny datetime sloupce jsou `TEXT` místo `TIMESTAMP WITH TIME ZONE`. To znemožňuje efektivní date-range queries a správné řazení.

**Doporučení:** Migrovat na `TIMESTAMP WITH TIME ZONE`.

---

### 14. DATABÁZE: Chybějící constraints
- Žádný `UNIQUE(revizeId, pristrojId)` na tabulce `revizePristroj` — umožňuje duplicitní vazby
- Žádné `CHECK` constraints pro enumy (`stav`, `zavaznost`, `typRevize`)
- `fotky TEXT` ukládá JSON pole Base64 obrázků — extrémně neefektivní, nafukuje databázi

---

### 15. VÝKON: Base64 obrázky v databázi
Fotky závad a loga jsou ukládány jako Base64 stringy přímo v databázi. Jeden obrázek = ~1.3x originální velikost. S více fotkami na závadu se rychle nafukuje.

**Doporučení:** Přesunout na file storage (disk/S3) a ukládat jen cestu/URL.

---

### 16. CHYBĚJÍCÍ FEATURE: Žádná paginace
Všechny API endpointy vrací všechny záznamy (`SELECT * FROM revize ORDER BY...`). S rostoucí databází to bude problém.

**Doporučení:** Zavést stránkování s `LIMIT/OFFSET` nebo cursor-based pagination.

---

### 17. VÝKON: ProtectedRoute ověřuje token API voláním při KAŽDÉM renderu
**Soubor:** `src/components/ProtectedRoute.tsx`

Každý mount provede `POST /api/auth/verify`. Při navigaci mezi stránkami se to volá opakovaně. Plus obsahuje ~10 `console.log` statements.

**Doporučení:** Cache výsledek verifikace na omezenou dobu, nebo dekódovat JWT lokálně a ověřovat jen expiraci.

---

### 18. VÝKON: Neefektivní `getById` metody v database.ts
**Soubor:** `src/services/database.ts`

```ts
// mistnostService.getById
async getById(id: number): Promise<Mistnost | undefined> {
  const all = await this.getAll();        // stáhne VŠECHNO
  return all.find(m => m.id === id);      // vybere jednu
}
```

Totéž u `zakazkaService.getById()` a `zavadaKatalogService.getById()`. Stáhne se celá kolekce aby se vybralo jedno ID.

**Doporučení:** Implementovat skutečné `GET /api/mistnosti/:id` endpointy.

---

### 19. VÝKON: JSON.parse v každém renderu
**Soubor:** `src/pages/RevizeDetailPage.tsx`

```tsx
const currentOpatreni = formData.ochranaOpatreni ? JSON.parse(formData.ochranaOpatreni) : [];
```

`JSON.parse` se volá uvnitř `.map()` iterace při každém renderu. Mělo by se parsovat jednou a uložit do stavu.

**Doporučení:** Parsovat v `useEffect`/`useMemo` a uložit do state.

---

### 20. BEZPEČNOST: Žádný rate limiting na auth endpointech
Přihlašovací endpoint (`POST /api/auth/login`) nemá žádné omezení počtu pokusů. Umožňuje brute-force útoky.

**Doporučení:** Přidat `express-rate-limit` middleware na `/api/auth/login`.

---

### 21. MRTVÝ KÓD: Prázdné implementace
**Soubor:** `src/services/database.ts`

```ts
rozvadecService.getById(_id: number) { return undefined; }  // nikdy nevrátí data
zarizeniService.getAll() { return []; }                       // vrací prázdné pole
zarizeniService.getById(_id: number) { return undefined; }
```

**Doporučení:** Implementovat nebo smazat.

---

### 22. NEKONZISTENCE: Exportní styly komponent

| Styl | Soubory |
|------|---------|
| `export function X()` | Dashboard, RevizePage, FirmyPage, ZavadyPage... |
| `export default function X()` | LoginPage, ProtectedRoute |
| `const X: React.FC = ()` | ZakazniciPage |

**Doporučení:** Sjednotit na `export function X()`.

---

## 🟢 NÍZKÁ PRIORITA

### 23. PŘÍSTUPNOST (A11Y)
- Žádné `aria-label` na interaktivních prvcích (tabulky, ikony, záložky)
- Emoji jako ikony bez screen-reader alternativ (`📋`, `⚡`, `⚠️`)
- Modal nemá focus trap — tab může opustit modál
- Modal neautofocusuje první input
- Hamburger menu má `aria-label="Toggle menu"` — mělo by být v češtině

---

### 24. CHYBĚJÍCÍ FEATURES
- **Žádné toast notifikace** — success/error se zobrazují přes `alert()` nebo dočasný state
- **Žádný audit log** — kdo co kdy změnil
- **Žádné řazení sloupců** v tabulkách
- **Žádný export do PDF** — existuje jen tisková preview (`ReportPrintPage`)
- **Žádné vyhledávání** v detailu revize (okruhy, závady, zařízení)
- **Žádné klávesové zkratky** (Ctrl+S pro uložení)

---

### 25. MOBILE UX
- Tabulky používají jen `overflow-x-auto` — na mobilu se horizontálně scrollují místo přepnutí na card layout
- Některé formuláře mají `grid-cols-4` bez responsive breakpointů

---

### 26. KÓD: Inline handler logika v JSX
**Soubor:** `src/pages/RevizeDetailPage.tsx`

Mnoho onChange handlerů obsahuje komplexní logiku přímo v JSX atributech:
```tsx
onChange={(e) => {
  const zakaznikId = e.target.value;
  setSelectedZakaznikId(zakaznikId);
  if (zakaznikId) { const zakaznik = zakaznici.find(...); if (zakaznik) setFormData({...}); }
  else { setFormData({ ...formData, zakaznikId: undefined }); }
}}
```

**Doporučení:** Extrahovat do pojmenovaných handlerů.

---

## Shrnutí

| Priorita | Kategorie | Počet |
|----------|-----------|-------|
| 🔴 Vysoká | Bezpečnost | 3 |
| 🔴 Vysoká | Výkon | 3 |
| 🔴 Vysoká | Architektura | 3 |
| 🟡 Střední | UX/Validace | 2 |
| 🟡 Střední | Backend | 3 |
| 🟡 Střední | Databáze | 2 |
| 🟡 Střední | Výkon | 4 |
| 🟡 Střední | Bezpečnost | 2 |
| 🟢 Nízká | A11Y/UX/Kód | 4 |
