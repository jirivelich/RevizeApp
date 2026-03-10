# RevizeApp — Postup provádění změn

## 1. Pravidla pro práci s Copilotem

Před každou session s AI asistentem:

### PŘED změnami
1. **Commitni vše rozpracované** — nikdy nezačínej novou funkci s "dirty" working tree
2. **Ověř, že aplikace běží** — `npm run dev` + `cd server && npx tsx server.ts`
3. **Ověř TypeScript** — `npx tsc --noEmit` musí projít bez chyb
4. **Řekni Copilotovi co je hotové** — ať ví, co nesmí rozbít

### PO změnách
1. **TypeScript check** — `npx tsc --noEmit`
2. **Spusť aplikaci** — ověř, že se načte bez chyb v konzoli
3. **Otestuj změněnou funkci** — rychlý manuální test
4. **Commitni hned** — malé commity, jedna logická změna = jeden commit

### KDYŽ něco nefunguje
1. **NEPANIKAŘ** — máš git, vrátíš se
2. `git diff <soubor>` — podívej se, co se změnilo
3. `git checkout -- <soubor>` — vrať konkrétní soubor do posledního commitu
4. `git stash` — odlož všechny změny, ověř že "čistá" verze funguje
5. `git stash pop` — vrať změny zpět

---

## 2. Git Branching strategie

```
main                    ← stabilní verze, vždy funkční
  └── feature/xxx       ← nová funkce (hromosvod, word-export, ...)
        └── (commituj často, malé kroky)
```

### Postup pro novou funkci:
```bash
# 1. Ujisti se, že jsi na main a je čistý
git checkout main
git status              # musí být clean

# 2. Vytvoř novou větev
git checkout -b feature/nazev-funkce

# 3. Pracuj, commituj po malých krocích
git add -A
git commit -m "feat: popis co jsem udělal"

# 4. Až je hotovo a otestováno, mergnit do main
git checkout main
git merge feature/nazev-funkce

# 5. Smaž feature větev
git branch -d feature/nazev-funkce
```

### Pojmenování commitů:
| Prefix | Použití | Příklad |
|--------|---------|---------|
| `feat:` | Nová funkce | `feat: Word export pro elektro revize` |
| `fix:` | Oprava bugu | `fix: dropdown clipping v PredvolenyTextBtn` |
| `refactor:` | Přepis bez změny chování | `refactor: přesun komponent do podsložek` |
| `style:` | Pouze vizuální změny | `style: tmavý sidebar, nové barvy` |
| `chore:` | Údržba, dependencies | `chore: update docx package` |
| `db:` | Databázové migrace | `db: přidání hromosvod sloupců` |

---

## 3. Kontrolní seznam před mergem do main

- [ ] `npx tsc --noEmit` — žádné TypeScript chyby
- [ ] `npm run build` — produkční build projde
- [ ] Aplikace se spustí (frontend + backend)
- [ ] Testované funkce fungují
- [ ] Existující funkce nebyly rozbity (rychlý smoke test):
  - [ ] Dashboard se načte
  - [ ] Seznam revizí se zobrazí
  - [ ] Detail revize se otevře
  - [ ] Tiskový náhled funguje
  - [ ] Přihlášení/odhlášení funguje

---

## 4. Zálohovací strategie

### Automatická záloha před velkými změnami:
```bash
# Vytvoř záložní tag
git tag backup/pred-velkymi-zmenami

# Pokud se něco rozbije, vrať se:
git checkout backup/pred-velkymi-zmenami
```

### Databáze:
- Před migracemi: použij Zálohy v Nastavení (export JSON)
- Nebo: `pg_dump revizeapp > backup_YYYY-MM-DD.sql`

---

## 5. Pravidla pro AI asistenta (Copilot)

Tato pravidla předej Copilotovi na začátku session:

```
PRAVIDLA:
1. Před každou editací souboru přečti aktuální stav souboru
2. Po editaci ověř TypeScript: npx tsc --noEmit
3. Neměň soubory, které nesouvisí s aktuálním úkolem
4. Pokud si nejsi jistý strukturou, přečti soubor — nehádej
5. Při editaci používej dostatek kontextu (3-5 řádků kolem)
6. Commitni po dokončení každého logického celku
```

---

## 6. Aktuální stav k zazálohování

### Hotové funkce (od posledního commitu 8d7b096):
- Vizuální přepracování (tmavý sidebar, nové barvy) — 25+ souborů
- Hromosvod modul (formulář, záložky, DB migrace)
- Hromosvod tiskový náhled (HromosvodPrintPage)
- NahledRouter (automatický routing dle kategorie)
- Word export (elektro + hromosvod)
- AI funkce (chat, autofill, generování závěru)
- Fix dropdown clipping (PredvolenyTextBtn)
- Plánování přesun do podsložky

### Doporučené commity pro současný stav:
```bash
# Krok 1: Commitni current stav jako "mega commit"
git add -A
git commit -m "feat: hromosvod modul, word export, AI funkce, styling overhaul"

# NEBO lépe — rozděl do logických commitů:
git add src/pages/RevizeDetail/ src/types/index.ts server/database.ts
git commit -m "feat: hromosvod formulář a DB migrace"

git add src/pages/HromosvodPrint/ src/pages/NahledRouter.tsx
git commit -m "feat: hromosvod tiskový náhled"

git add src/services/wordExport.ts src/services/wordExportHromosvod.ts src/pages/ReportPrint/ReportPrintPage.tsx
git commit -m "feat: Word export (elektro + hromosvod)"

git add src/components/AIChatAssistant.tsx src/components/AIAutofillButton.tsx server/ai.ts
git commit -m "feat: AI chat a autofill"

git add src/components/Sidebar.tsx src/components/Layout.tsx src/components/ui/
git commit -m "style: tmavý sidebar, přepracování UI komponent"

git add -A
git commit -m "chore: ostatní drobné úpravy"
```
