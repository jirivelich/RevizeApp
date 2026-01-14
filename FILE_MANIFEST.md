# 📋 RevizeApp - Manifest souborů

## Struktura projektu po přidání backendu

```
RevizeAppWeb/
├── 📁 server/                          # Backend aplikace
│   ├── server.ts                       # ✨ Express server, API endpoints
│   ├── database.ts                     # 📊 SQLite databáze, schéma
│   ├── package.json                    # 📦 Backend závislosti
│   ├── tsconfig.json                   # ⚙️ TypeScript konfigurace
│   ├── .env                            # 🔐 Environment proměnné
│   ├── .gitignore                      # 🚫 Ignorované soubory
│   ├── README.md                       # 📖 Backend dokumentace
│   └── data/                           # 💾 SQLite databáze (dynamicky)
│
├── 📁 src/
│   ├── 📁 services/
│   │   ├── api.ts                      # ✨ Frontend API klient
│   │   ├── database.ts                 # 📊 IndexedDB (offline)
│   │   ├── pdfExport.ts                # 📄 PDF export
│   │   └── fontUtils.ts                # 🔤 Podpora českých fontů
│   │
│   ├── 📁 components/                  # React komponenty
│   │   ├── Layout.tsx                  # 📱 Main layout, responsive
│   │   ├── Sidebar.tsx                 # 🧭 Navigace, mobile menu
│   │   ├── PDFExportModal.tsx          # 📄 Export dialog
│   │   └── 📁 ui/                      # UI komponenty
│   │
│   ├── 📁 pages/                       # Stránky aplikace
│   │   ├── Dashboard.tsx               # 📊 Přehled
│   │   ├── RevizePage.tsx              # 📋 Seznam revizí
│   │   ├── RevizeDetailPage.tsx        # ✏️ Detail revize, 5 tabů
│   │   ├── BackupRestorePage.tsx       # 💾 Backup/restore
│   │   ├── NastaveniPage.tsx           # ⚙️ Nastavení
│   │   └── ... (další stránky)
│   │
│   ├── 📁 types/
│   │   └── index.ts                    # 📝 TypeScript typy
│   │
│   ├── 📁 assets/                      # Obrázky, ikony
│   ├── App.tsx                         # Main komponenta
│   ├── main.tsx                        # Entry point
│   ├── App.css                         # Globální styly
│   └── index.css                       # Tailwind CSS
│
├── 📁 public/                          # Static soubory
│
├── .env.local                          # ✨ Frontend environment
├── vite.config.ts                      # ✨ Vite + API proxy
├── tsconfig.json                       # Frontend TypeScript config
├── tsconfig.app.json                   # App-specific config
├── tsconfig.node.json                  # Node/Vite config
├── eslint.config.js                    # Linting pravidla
├── package.json                        # Frontend závislosti
├── run-backend.bat                     # ✨ Windows startup script
├── run-backend.sh                      # ✨ Linux/Mac startup script
├── README.md                           # ✨ Projekt dokumentace
└── index.html                          # HTML template
```

## ✨ Nově přidané soubory

### Backend
- **server/server.ts** - Express server s REST API
  - 8 endpoints pro zdravotní kontrolu, revize, rozvaděče, nastavení, backup
  - CORS konfigurován pro frontend
  - Error handling middleware
  - Port: 3001

- **server/database.ts** - SQLite databáze
  - 13 tabulek s komplexními relacemi
  - Foreign keys s CASCADE delete
  - 8 indexů pro optimalizaci
  - initializeDatabase() funkce

- **server/package.json** - Aktualizován
  - express, cors, better-sqlite3
  - TypeScript, ts-node, nodemon
  - Scripts: start, dev, build

- **server/tsconfig.json** - Backend TypeScript config
  - Target: ES2020
  - Module: ESNext
  - Strict mode

- **server/.env** - Backend proměnné
  - NODE_ENV
  - PORT
  - CORS_ORIGIN

- **server/.gitignore** - Ignorované soubory
  - node_modules/, dist/, data/, .env, .log

- **server/README.md** - Backend dokumentace
  - Setup, spuštění, API endpoints
  - Struktura databáze
  - Příklady

### Frontend
- **src/services/api.ts** - ✨ Frontend API klient
  - revizeApi (CRUD operace)
  - rozvadeceApi
  - nastaveniApi
  - backupApi
  - checkServerHealth()
  - fetch-based HTTP client

- **.env.local** - ✨ Frontend environment
  - VITE_API_URL=http://localhost:3001/api

- **vite.config.ts** - ✨ Aktualizován
  - Proxy pro /api -> localhost:3001
  - Development server proxy

- **run-backend.bat** - ✨ Windows startup
  - Automaticky instaluje npm dependencies
  - Spouští `npm run dev`

- **run-backend.sh** - ✨ Linux/Mac startup
  - Bash script pro spuštění

- **README.md** - ✨ Aktualizován
  - Full stack dokumentace
  - Frontend + Backend setup
  - API endpoints přehled

## 🔄 Aktualizované soubory

- **package.json** - Proxy konfigurace v vite
- **vite.config.ts** - Proxy middleware
- **server/package.json** - Nové verze, nodemon

## 📊 Tabulky v SQLite

1. **revize** - Hlavní revizní záznamy
2. **rozvadec** - Elektrické rozvaděče
3. **okruh** - Obvody v rozvaděči
4. **mistnost** - Místnosti v objektu
5. **zarizeni** - Elektrická zařízení
6. **zavada** - Zjištěné chyby/vady
7. **zakazka** - Pracovní objednávky
8. **mericiPristroj** - Měřicí přístroje
9. **revizePristroj** - Přiřazení přístrojů k revizi
10. **firma** - Údaje o firmě
11. **nastaveni** - Globální nastavení
12. **sablona** - Šablony PDF
13. **zavadaKatalog** - Katalog typických vad

## 🚀 Jak spustit

### Varianta 1: PowerShell (Windows)
```powershell
# Terminal 1
.\run-backend.bat

# Terminal 2
npm run dev
```

### Varianta 2: Manuálně
```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend
npm install
npm run dev
```

### Varianta 3: Linux/Mac
```bash
chmod +x run-backend.sh
./run-backend.sh

# V novém terminálu
npm run dev
```

## ✅ Kontrola funkčnosti

1. **Health check**: http://localhost:3001/api/health
2. **Frontend**: http://localhost:5173
3. **Backend**: http://localhost:3001/api

## 📝 Poznámky

- Backend používá SQLite pro persistenci dat
- Frontend má offline mód s IndexedDB
- Proxy v Vite automaticky forwarduje /api requesty na backend
- Databáze se automaticky inicializuje při prvním spuštění
- Soubory mají UTF-8 kódování pro správnou češtinu
