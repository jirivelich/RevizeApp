# Požadavky na obsah revizní zprávy

## Zákonné požadavky na zprávu o revizi vyhrazeného elektrického zařízení

Podle platné legislativy musí zpráva o revizi obsahovat následující položky:

---

### a) Identifikace provozovatele
**Název a sídlo právnické osoby** nebo **jméno, popřípadě jména, a příjmení a adresa podnikání** podnikající fyzické osoby, která revidované vyhrazené elektrické zařízení provozuje nebo bude provozovat.

**V aplikaci:** `Zakaznik` (zákazník/objednatel revize)
- Název/Jméno
- Adresa/Sídlo
- IČO, DIČ
- Kontaktní osoba

---

### b) Identifikace zařízení
Identifikace vyhrazeného elektrického zařízení, které je revidováno, **včetně místa umístění**.

**V aplikaci:** `Revize`
- Název objektu
- Adresa objektu
- Popis zařízení

---

### c) Vymezení rozsahu revize
Rozsah prováděné revize.

**V aplikaci:** Sekce "Vymezení rozsahu revize"
- Rozsah revize (textové pole)
- Předmět revize / Předmětem revize není

---

### d) Údaje o revizním technikovi
- Jméno, popřípadě jména, a příjmení
- Podpis
- Evidenční číslo osvědčení revizního technika

**V aplikaci:** `Nastaveni` (údaje o firmě/technikovi)
- Jméno technika
- Číslo osvědčení
- Podpis (obrázek nebo místo pro podpis)

---

### e) Typ revize
Určení, zda se jedná o:
- **Výchozí revizi**
- **Pravidelnou revizi**
- **Mimořádnou revizi** (+ uvedení důvodu)

**V aplikaci:** `Revize.typRevize`
- výchozí
- pravidelná
- mimořádná (+ pole pro důvod)

---

### f) Důležitá data
- Datum **zahájení** revize
- Datum **ukončení** revize
- Datum **vypracování** zprávy o revizi
- Datum **předání** zprávy o revizi

**V aplikaci:** `Revize`
- `datum` (datum provedení)
- `datumPlatnosti` (platnost do)
- TODO: Přidat pole pro datum zahájení, ukončení, vypracování, předání

---

### g) Soupis měřicích přístrojů
Seznam použitých měřicích přístrojů.

**V aplikaci:** `MericiPristroj` + `RevizePristroj`
- Název přístroje
- Výrobce
- Výrobní číslo
- Datum kalibrace
- Platnost kalibrace

---

### h) Seznam podkladů
Seznam podkladů použitých k provedení revize, **včetně jejich vyhodnocení** ve vzájemných souvislostech.

**V aplikaci:** Sekce "Podklady pro revizi"
- Seznam dokumentů
- Vyhodnocení podkladů

---

### i) Soupis provedených úkonů
Například:
- Prohlídka
- Zkouška
- Měření
- Vyhodnocení

**V aplikaci:** Sekce "Provedené úkony"
- Checklisty provedených úkonů
- Popis provedených prací

---

### j) Naměřené hodnoty
Výsledky měření.

**V aplikaci:** 
- `Rozvadec` + `Okruh` (měření izolace, impedance, proudu)
- `Mistnost` + `Zarizeni` (měření zařízení v místnostech)
- Tabulky s naměřenými hodnotami

---

### k) Přehled zjištěných závad
S uvedením **ustanovení porušených právních a ostatních předpisů** k zajištění bezpečnosti a ochrany zdraví při práci.

**V aplikaci:** `Zavada`
- Popis závady
- Závažnost (kritická, vážná, méně závažná)
- Porušený předpis/norma
- Doporučení k odstranění
- Lhůta k odstranění

---

### l) Slovní zhodnocení (závěr)
- Zda je vyhrazené elektrické zařízení z hlediska bezpečnosti **schopno provozu**
- Zda je provedení ochrany před bleskem a přepětím v souladu s předpisy
- Zda součásti jsou ve stavu způsobilém plnit požadovanou funkci
- **V případě neschopnosti provozu** - odůvodnění závěru

**V aplikaci:** `Revize`
- `vysledek` (schopno / neschopno provozu)
- `zaver` (slovní zhodnocení)
- Sekce "Závěr revize"

---

### m) Vyhodnocení předchozích revizí
Vyhodnocení případných záznamů o:
- Výsledcích provedených prohlídek a zkoušek
- Odstraňování závad zjištěných při předchozí revizi
- Provozu a údržbě vyhrazeného elektrického zařízení

**V aplikaci:** Sekce "Vyhodnocení předchozích revizí"
- Číslo předchozí revize
- Datum předchozí revize
- Stav odstranění závad

---

### n) Doporučení lhůty příští revize
Doporučená lhůta provedení příští revize.

**V aplikaci:** `Revize.datumPlatnosti`
- Automatický výpočet podle typu prostředí
- Možnost ručního nastavení

---

### o) Potvrzení o převzetí/předání
Potvrzení o převzetí nebo předání zprávy o revizi.

**V aplikaci:** Sekce "Podpisy"
- Podpis revizního technika
- Podpis objednatele/předávajícího
- Datum předání

---

## Mapování na sekce v aplikaci

| Požadavek | Sekce v aplikaci | Stav |
|-----------|------------------|------|
| a) Provozovatel | Zákazník | ✅ |
| b) Identifikace zařízení | Základní údaje, Objekt | ✅ |
| c) Rozsah revize | Vymezení rozsahu | ✅ |
| d) Revizní technik | Nastavení, Podpisy | ✅ |
| e) Typ revize | Základní údaje | ✅ |
| f) Data | Základní údaje | ⚠️ Částečně |
| g) Měřicí přístroje | Použité přístroje | ✅ |
| h) Podklady | Podklady pro revizi | ✅ |
| i) Provedené úkony | Provedené úkony | ✅ |
| j) Naměřené hodnoty | Rozvaděče, Měření | ✅ |
| k) Závady | Závady (příloha) | ✅ |
| l) Závěr | Závěr revize | ✅ |
| m) Vyhodnocení předchozích | Vyhodnocení předchozích | ✅ |
| n) Lhůta příští revize | Platnost do | ✅ |
| o) Předání | Podpisy | ✅ |

---

## TODO - Možná vylepšení

1. **Datum zahájení vs ukončení** - přidat samostatná pole pro:
   - Datum zahájení revize
   - Datum ukončení revize
   - Datum vypracování zprávy
   - Datum předání zprávy

2. **Důvod mimořádné revize** - přidat pole když typ = mimořádná

3. **Porušené předpisy u závad** - rozšířit katalog závad o reference na normy

4. **Elektronický podpis** - podpora pro uznávaný elektronický podpis

5. **Potvrzení o převzetí** - samostatná sekce s datem a podpisem objednatele

---

## Struktura úvodní strany PDF

Úvodní strana obsahuje konfigurovatelné bloky, které lze:
- ✅ **Zapnout/vypnout** v šabloně
- ✅ **Přeuspořádat** pomocí drag-and-drop
- ✅ **Nastavit rámečky** kolem jednotlivých sekcí

### Bloky úvodní strany (podle zákonných požadavků)

| # | ID bloku | Název | Zákonný požadavek | Obsah |
|---|----------|-------|-------------------|-------|
| 1 | `hlavicka` | **Hlavička** | d) Revizní technik | Firma (logo, název, adresa, IČO) + Technik (jméno, osvědčení) |
| 2 | `nadpis` | **Nadpis** | - | "ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ" |
| 3 | `provozovatel` | **Provozovatel** | a) Provozovatel | Název/Jméno, Sídlo/Adresa, IČO, DIČ, Kontaktní osoba |
| 4 | `objekt` | **Identifikace zařízení** | b) Identifikace | Druh zařízení, Místo umístění |
| 5 | `zakladni-udaje` | **Druh a data revize** | e) Typ, f) Data | Číslo zprávy, Druh revize, Datum zahájení/ukončení/vypracování |
| 6 | `vyhodnoceni` | **Závěrečné zhodnocení** | l) Závěr | "Zařízení JE/NENÍ SCHOPNO provozu" |
| 7 | `podpisy` | **Podpisy a předání** | d) Podpis, o) Předání | Místo pro podpis technika a objednatele |

### Sekce dokumentu (podle zákonných požadavků a-o)

| # | ID sekce | Název | Zákonný požadavek |
|---|----------|-------|-------------------|
| 1 | `provozovatel` | a) Identifikace provozovatele | a) |
| 2 | `identifikace-zarizeni` | b) Identifikace revidovaného zařízení | b) |
| 3 | `rozsah-revize` | c) Vymezení rozsahu revize | c) |
| 4 | `revizni-technik` | d) Revizní technik | d) |
| 5 | `typ-revize` | e) Typ a druh revize | e) |
| 6 | `data-revize` | f) Data revize | f) |
| 7 | `merici-pristroje` | g) Soupis měřicích přístrojů | g) |
| 8 | `podklady` | h) Podklady pro revizi | h) |
| 9 | `provedene-ukony` | i) Soupis provedených úkonů | i) |
| 10 | `namerene-hodnoty` | j) Naměřené hodnoty | j) |
| 11 | `zavady` | k) Přehled zjištěných závad | k) |
| 12 | `zaver` | l) Závěrečné zhodnocení | l) |
| 13 | `vyhodnoceni-predchozich` | m) Vyhodnocení předchozích revizí | m) |
| 14 | `pristi-revize` | n) Lhůta příští revize | n) |
| 15 | `predani` | o) Potvrzení o předání | o) |

### Nastavení v šabloně

```typescript
// Konfigurace úvodní strany v šabloně
{
  uvodniStranaZobrazit: boolean,           // Zobrazit úvodní stranu
  uvodniStranaNadpis: string,              // Text nadpisu
  uvodniStranaNadpisFontSize: number,      // Velikost písma nadpisu (výchozí 18)
  uvodniStranaNadpisRamecek: boolean,      // Rámeček kolem nadpisu
  uvodniStranaRamecekUdaje: boolean,       // Rámeček kolem základních údajů
  uvodniStranaRamecekObjekt: boolean,      // Rámeček kolem údajů o objektu
  uvodniStranaRamecekZakaznik: boolean,    // Rámeček kolem údajů o zákazníkovi
  uvodniStranaRamecekVyhodnoceni: boolean, // Rámeček kolem vyhodnocení
  uvodniStranaZobrazitFirmu: boolean,      // Zobrazit údaje o firmě
  uvodniStranaZobrazitTechnika: boolean,   // Zobrazit údaje o technikovi
  uvodniStranaZobrazitObjekt: boolean,     // Zobrazit údaje o objektu
  uvodniStranaZobrazitZakaznika: boolean,  // Zobrazit údaje o zákazníkovi
  uvodniStranaZobrazitVyhodnoceni: boolean,// Zobrazit vyhodnocení
  uvodniStranaZobrazitPodpisy: boolean,    // Zobrazit podpisy
  podpisyUmisteni: 'uvodni' | 'posledni',  // Umístění podpisů
  uvodniStranaBloky: UvodniStranaBlok[],   // Pořadí a viditelnost bloků
}
```

### Pokrytí zákonných požadavků na úvodní straně

| Požadavek zákona | Blok na úvodní straně |
|------------------|----------------------|
| a) Provozovatel | ✅ `zakaznik` |
| b) Identifikace zařízení | ✅ `objekt` |
| c) Rozsah revize | ❌ (v sekci dokumentu) |
| d) Revizní technik | ✅ `hlavicka` + `podpisy` |
| e) Typ revize | ✅ `zakladni-udaje` |
| f) Datum | ✅ `zakladni-udaje` |
| l) Závěr/Vyhodnocení | ✅ `vyhodnoceni` |
| o) Předání | ✅ `podpisy` |
