# Offline režim a PWA – implementace a požadavky

## Změny v projektu

1. **Service Worker (public/sw.js)**
   - Implementace cache statických souborů a vybraných API odpovědí.
   - Strategie: "cache first" pro statické soubory, "network first" pro API.

2. **Manifest (public/manifest.json, index.html)**
   - Přidán manifest a meta tagy pro PWA instalaci na Android.

3. **Dexie (src/db.ts)**
   - Přidána tabulka `pendingRequests` pro offline frontu API požadavků.
   - Typy importovány pomocí `import type` kvůli `verbatimModuleSyntax`.

4. **Hooky a komponenty**
   - `src/hooks/useOfflineQueue.ts`: Správa offline fronty, typové importy.
   - `src/hooks/useOnlineStatus.ts`: Detekce online/offline stavu.
   - `src/components/OfflineBanner.tsx`: Banner při offline režimu.

5. **App.tsx**
   - Přidán ErrorBoundary, QueryClientProvider, OfflineBanner a správné importy.
   - Opraven import NahledRouter.

6. **Konfigurace Vite**
   - Použití `vite-plugin-static-copy` pro kopírování sw.js do dist/.

7. **Typové importy**
   - Všechny typy (např. `PendingRequest`, `Table`) importovány pomocí `import type` dle požadavků TypeScriptu s `verbatimModuleSyntax`.

---

## Požadavky na offline režim

- **PWA**: Aplikace je instalovatelná na Android/iOS, funguje i bez připojení.
- **Service Worker**: Cache-uje statické soubory a vybrané GET API odpovědi.
- **Offline fronta**: Zápisové API požadavky (POST/PUT/DELETE) se při offline stavu ukládají do IndexedDB a synchronizují po návratu online.
- **UI**: Uživatel je informován o offline režimu bannerem.
- **Typová bezpečnost**: Všechny typy importovány správně pro moderní TypeScript.

---

## Důležité poznámky

- Pro správné fungování je nutné mít nainstalované balíčky `dexie`, `@types/dexie` a `vite-plugin-static-copy`.
- Pokud používáte TypeScript s `verbatimModuleSyntax`, vždy importujte typy pomocí `import type`.
- Po změnách je vhodné restartovat editor nebo TypeScript server.

---

*Poslední úprava: 1. 4. 2026*
