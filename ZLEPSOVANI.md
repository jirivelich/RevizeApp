# Nápady na zlepšení RevizeApp

Vygenerováno: 10. dubna 2026

---

## Rychlost psaní zpráv

1. **Šablony sekcí (Předvolené texty)** — Tabulka `predvolenyText` v DB už existuje, ale UI pravděpodobně není plně využito. Sada kliknutelných „bloků" pro popis rozsahu, metod, závěr — technik vybírá, nepisuje od nuly.

2. **Kopírování struktury z předchozí revize** — Při zakládání nové revize nabídni: *„Zkopírovat rozvaděče/místnosti z předchozí revize tohoto zákazníka?"* Ušetří 10–20 minut u pravidelných periodických revizí.

3. ~~**Hromadný vstup závad** — Místo modálního okna po jedné závadě: tabulkový inline editor (jako Excel) — Tab pro přechod na další pole, Enter pro nový řádek. Drasticky zrychlí zadávání C2/C3 závad.~~ ✅ *Splněno 10. 4. 2026*

4. **AI klasifikace závad v reálném čase** — Při psaní popisu závady AI okamžitě navrhne stupeň (C1/C2/C3) + příslušnou normu ČSN. Aktuálně autofill existuje, ale toto by bylo kontextové na konkrétní závadu.

5. **Průvodce vyplněním (Completion progress)** — Procentuální ukazatel dokončení záložek v `RevizeDetailPage`. Technik vidí co chybí před tiskem.

---

## Nové funkce s vysokým dopadem

6. **Přímé odeslání zprávy emailem** — `POST /api/send-report` → PDF poslat přímo zákazníkovi z aplikace. Aktuálně musí technik exportovat, otevřít email, přiložit.

7. **QR kód / štítky zařízení** — Generování QR štítku pro každé `Zarizeni` s datem příští revize. Sken telefonu → otevře přehled zařízení. Perfektní pro průmyslové objekty.

8. **Porovnání s předchozí revizí** — View vedle sebe: aktuální vs. předchozí revize stejného objektu. Zvýraznění nových závad nebo změněných hodnot. Zákazník vidí progress.

9. **Portál pro zákazníka (read-only link)** — Unikátní URL (bez přihlášení) kde zákazník vidí svou zprávu. Elegantní alternativa k PDF emailu.

10. **Import měření z přístroje** — CSV import z Metrel/Fluke/Sonel zařízení → auto-fill hodnot okruhů. Technici tato zařízení používají a data jsou dostupná.

---

## AI vylepšení

11. **AI kontrola normy před tiskem** — Před generováním zprávy AI projde celou revizi a upozorní: *„Okruh č. 3 nemá vyplněnou impedanci smyčky — povinné dle ČSN 33 2000-6."*

12. **Prediktivní datum příští revize** — Na základě kategorie budovy, nalezených závad a typu instalace AI navrhne termín a periodicitu.

13. **Hlasový vstup na mobilu** — Nadiktování popisu závady přímo na místě. Web Speech API → transkript → AI upracuje do technické formulace.

---

## UX detaily

14. ~~**Klávesové zkratky** — `Ctrl+S` uložit, `Ctrl+D` duplikovat (otevře dialog kopie revize). Technici pracující celý den to ocení.~~ ✅ *Splněno 10. 4. 2026*

15. **Offline-first měření** — Možnost zadat celou revizi offline na tabletu v terénu, sync při připojení. `useOfflineQueue` hook existuje, záleží jak plně je implementovaný.

16. **Dark mode** — Práce v rozvaděčových rozvodnách = tmavé prostředí. Dark mode = komfort.
