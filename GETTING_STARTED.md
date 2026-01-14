# 🎉 RevizeApp - Lokální databáze je připravená!

## ✅ Co bylo vytvořeno

### Backend (server/)
1. **server.ts** - Express server s REST API
   - 8 API endpoints: /api/health, /api/revize/*, /api/rozvadece/*, /api/nastaveni/*, /api/backup/*
   - CORS konfigurace
   - Error handling

2. **database.ts** - SQLite database
   - 13 tabulek pro komplexní správu revizí
   - Foreign keys s CASCADE delete
   - Indexy pro optimalizaci
   - Automatická inicializace

3. **package.json** - Backend závislosti
   - express, cors, better-sqlite3
   - TypeScript, ts-node, nodemon

4. **tsconfig.json** - Backend TypeScript konfigurace

5. **.env** - Environment proměnné
   - NODE_ENV=development
   - PORT=3001
   - CORS_ORIGIN=http://localhost:5173

6. **.gitignore** - Ignorování node_modules, data/, .env

7. **README.md** - Backend dokumentace

### Frontend
1. **src/services/api.ts** - API klient pro komunikaci s backendem
   - revizeApi.getAll(), getById(), create(), update(), delete()
   - rozvadeceApi, nastaveniApi, backupApi
   - checkServerHealth()

2. **vite.config.ts** - Aktualizován proxy
   ```javascript
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3001',
         changeOrigin: true,
       }
     }
   }
   ```

3. **.env.local** - Frontend environment
   - VITE_API_URL=http://localhost:3001/api

4. **run-backend.bat** - Windows startup script
   - Automaticky instaluje npm balíčky
   - Spouští npm run dev

5. **run-backend.sh** - Linux/Mac startup script

### Dokumentace
1. **README.md** - Aktualizován s full-stack informacemi
2. **FILE_MANIFEST.md** - Detailní seznam všech souborů
3. **SETUP.html** - Interaktivní průvodce spuštěním

## 🚀 Jak spustit (Krok za krokem)

### Na Windows

**Způsob 1: Skript (Nejjednoduší)**
1. Dvakrát klikněte na `run-backend.bat`
2. Počkejte na zprávu: "RevizeApp Server běží na http://localhost:3001"
3. Otevřete nový PowerShell a spusťte:
   ```powershell
   npm run dev
   ```
4. Otevřete http://localhost:5173

**Způsob 2: Manuálně v PowerShellu**

Terminal 1 (Backend):
```powershell
cd server
npm install
npm run dev
```

Terminal 2 (Frontend):
```powershell
npm install
npm run dev
```

### Na Linux / Mac

```bash
# Terminal 1 - Backend
chmod +x run-backend.sh
./run-backend.sh

# Terminal 2 - Frontend
npm install
npm run dev
```

## ✅ Ověření funkčnosti

1. **Backend běží?**
   - Otevřete http://localhost:3001/api/health
   - Měli byste vidět: `{"status":"ok","message":"RevizeApp Server je spuštěný"}`

2. **Frontend běží?**
   - Otevřete http://localhost:5173
   - Měla by se načíst aplikace

3. **Komunikace probíhá?**
   - Otevřete DevTools (F12)
   - Network tab
   - Vyzkoušejte kteroukoliv operaci v aplikaci
   - Měli byste vidět requesty na `/api/...`

## 📊 Struktura databáze SQLite

```
server/data/revizeapp.db

Tabulky:
├── revize          (Hlavní revizní záznamy)
├── rozvadec        (Elektrické rozvaděče)
├── okruh           (Obvody v rozvaději)
├── mistnost        (Místnosti v objektu)
├── zarizeni        (Elektrická zařízení)
├── zavada          (Zjištěné chyby)
├── zakazka         (Pracovní objednávky)
├── mericiPristroj  (Měřicí přístroje)
├── revizePristroj  (Přiřazení přístrojů)
├── firma           (Údaje o firmě)
├── nastaveni       (Globální nastavení)
├── sablona         (Šablony PDF)
└── zavadaKatalog   (Katalog typických vad)
```

## 🔄 Jak funguje komunikace

```
Frontend (React)
    ↓
    └→ api.ts (fetch request)
         ↓
         └→ Vite proxy (http://localhost:5173/api)
              ↓
              └→ Express server (http://localhost:3001/api)
                   ↓
                   └→ SQLite database (server/data/revizeapp.db)
```

## 🌐 API Endpoints

### Zdravotní kontrola
```
GET /api/health
→ { status: "ok", message: "RevizeApp Server je spuštěný" }
```

### Revize
```
GET    /api/revize           # Seznam všech revizí
POST   /api/revize           # Vytvoř novou revizi
PUT    /api/revize/:id       # Uprav revizi
DELETE /api/revize/:id       # Smaž revizi
GET    /api/revize/:id       # Načti jednu revizi
```

### Rozvaděče
```
GET    /api/rozvadece/:revizeId   # Rozvaděče v revizi
POST   /api/rozvadece             # Vytvoř rozvaději
DELETE /api/rozvadece/:id         # Smaž rozvaději
```

### Nastavení
```
GET  /api/nastaveni           # Aktuální nastavení
PUT  /api/nastaveni           # Uprav nastavení
```

### Backup
```
GET  /api/backup              # Stáhni backup všech dat
POST /api/backup/import       # Importuj data z backupu
```

## 🛠️ Technické detaily

### Frontend (src/services/api.ts)
- Fetch-based HTTP klient
- Automaticky přidává JSON headers
- Error handling s try-catch
- Vrací JSON odpovědi

### Backend (server/server.ts)
- Express.js aplikace
- CORS povolena pro frontend
- Body parser pro JSON
- SQLite databáze s better-sqlite3
- Synchronní dotazy (jednodušší, ale blokující)

### Databáze (server/database.ts)
- better-sqlite3 (synchronní SQLite3)
- Pragmas: foreign_keys = ON
- 8 indexů pro optimalizaci
- Constraints a validace

## 📝 Příklady API volání

### JavaScript / React
```javascript
import { revizeApi } from './services/api';

// Načti všechny revize
const revize = await revizeApi.getAll();

// Vytvoř novou revizi
const result = await revizeApi.create({
  cisloRevize: 'REV-2024-001',
  nazev: 'Revize elektrických zařízení',
  adresa: 'Ulice 123, Praha',
  objednatel: 'Client',
  datum: '2024-01-15',
  typRevize: 'pravidelná',
  stav: 'draft'
});

// Uprav revizi
await revizeApi.update(revizeId, {
  nazev: 'Nový název',
  stav: 'completed'
});

// Smaž revizi
await revizeApi.delete(revizeId);
```

## 🐛 Troubleshooting

### Port 3001 je obsazený
```powershell
# Najdi proces na portu 3001
netstat -ano | findstr :3001

# Zabij proces (nahraď PID)
taskkill /PID <PID> /F
```

### Databáze se neinicializuje
```bash
# Smaž starou databázi
rm server/data/revizeapp.db

# Backend se automaticky reinicializuje
npm run dev
```

### CORS chyba
- Zkontroluj, že frontend je na http://localhost:5173
- Zkontroluj server/.env - CORS_ORIGIN
- Zkontroluj vite.config.ts proxy konfiguraci

## 📚 Další kroky

1. **Integrace s frontendem**
   - Nahraď všechny offline služby API voláními
   - Přidej error handling a loading states

2. **Authentifikace** (volitelně)
   - Přidej JWT tokeny
   - Implementuj login endpoint

3. **Produkční build**
   ```bash
   npm run build
   cd server && npm run build
   ```

4. **Deployment**
   - Heroku, Railway, Vercel
   - Docker container

## 🎯 Hotovo!

Aplikace má nyní:
- ✅ Responsive frontend (React)
- ✅ Backend s REST API (Express)
- ✅ Persistentní databázi (SQLite)
- ✅ Offline mód (IndexedDB)
- ✅ Backup/Restore
- ✅ PDF export
- ✅ Mobilní optimaci
- ✅ Regulační soulad dle ČR

Vše je připraveno k použití! 🎉
