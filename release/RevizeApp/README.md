# RevizeApp - Aplikace pro kontrolu elektrických zařízení

Kompletní React aplikace pro správu a dokumentaci revizí elektrických zařízení - dostupná jako **webová** i **desktopová** aplikace.

## 🎯 Features

✅ **Frontend (React + TypeScript + Vite)**
- Responsive design s mobilní optimací
- PDF export pro revizní zprávy
- Management revizí a rozvaděčů
- Lokální databáze (IndexedDB)
- Hamburger menu pro mobil
- Backup/restore funkcionalita

✅ **Backend (Node.js + Express + SQLite)**
- RESTful API pro správu dat
- Persistentní SQLite databáze
- CORS povolena
- Backup endpoints

✅ **Desktop (Electron)**
- Samostatná desktopová aplikace
- Windows, macOS, Linux podpora
- Nativní menu a klávesové zkratky
- Offline funkčnost
- Automatické spouštění backendu

✅ **Regulační soulad**
- Pole dle české legislativy pro kontrolu elektrických zařízení
- Rozsah revize, podklady, provedené úkony
- Měřicí přístroje a zařízení
- Podpisy revizora a objednávajícího

---

## 🚀 Rychlý start

### Varianta 1️⃣: Desktopová aplikace (Electron)

**Windows:**
```bash
.\run-electron.bat
```

**Linux/Mac:**
```bash
chmod +x run-electron.sh
./run-electron.sh
```

📖 Více informací: [ELECTRON.md](ELECTRON.md)

### Varianta 2️⃣: Webová aplikace (Browser)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Přístup:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

---

## 📦 Build pro produkci

### Desktop aplikace

**Windows:**
```bash
.\build-electron.bat
```

Nebo pro všechny platformy:
```bash
npm run electron:build:win    # Windows (.exe)
npm run electron:build:mac    # macOS (.dmg)
npm run electron:build:linux  # Linux (.AppImage, .deb)
```

**Výstup:** `release/` složka s instalátory

### Webová aplikace

```bash
npm run build
```

**Výstup:** `dist/` složka

---
## 📋 Struktura projektu

```
RevizeAppWeb/
├── 📁 electron/                        # 🖥️ Electron (Desktop)
│   ├── main.js                         # Hlavní proces
│   ├── preload.js                      # Preload bridge
│   ├── icon.png/ico/icns               # Ikony aplikace
│   └── ICONS.md                        # Návod na ikony
│
├── 📁 src/                             # Frontend zdrojový kód (React)
│   ├── components/                     # React komponenty
│   ├── pages/                          # Stránky aplikace
│   ├── services/                       # API, databáze, electron
│   └── types/                          # TypeScript typy
│
├── 📁 server/                          # Backend zdrojový kód
│   ├── server.ts                       # Express app
│   ├── database.ts                     # SQLite schema
│   ├── package.json                    # Backend dependencies
│   └── data/                           # SQLite databáze
│
├── 📁 dist/                            # Build výstupy (Frontend)
├── 📁 release/                         # Electron build výstupy
│
├── vite.config.ts                      # Vite konfigurace
├── package.json                        # Frontend + Electron config
├── run-electron.bat                    # 🖥️ Spustit Electron (Windows)
├── build-electron.bat                  # 🖥️ Build desktop app (Windows)
├── ELECTRON.md                         # 📖 Electron dokumentace
└── README.md                           # Tento soubor
```

---

## 🛠️ API Endpoints

### Health Check
- `GET /api/health` - Ověř, že server běží

### Revize
- `GET /api/revize` - Seznam všech revizí
- `POST /api/revize` - Vytvoř novou revizi
- `PUT /api/revize/:id` - Uprav revizi
- `DELETE /api/revize/:id` - Smaž revizi

### Rozvaděče
- `GET /api/rozvadece/:revizeId` - Rozvaděče pro revizi
- `POST /api/rozvadece` - Vytvoř rozvaděč
- `DELETE /api/rozvadece/:id` - Smaž rozvaděč

### Nastavení
- `GET /api/nastaveni` - Aktuální nastavení
- `PUT /api/nastaveni` - Uprav nastavení

### Backup
- `GET /api/backup` - Stáhni backup
- `POST /api/backup/import` - Importuj backup

---

## 💻 Technologie

### Frontend
- React 18+
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Dexie.js (IndexedDB)
- jsPDF (PDF export)

### Backend
- Node.js
- Express.js
- SQLite (better-sqlite3)
- TypeScript

### Desktop
- Electron 28+
- electron-builder
- Multi-platform support

---

## ⚙️ Konfigurace

### Frontend Environment
Vytvořit `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

### Backend Environment
V `server/.env`:
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Backend Database
SQLite databáze se automaticky vytvoří v `server/data/revizeapp.db`

---

## 📚 Dokumentace

- **[ELECTRON.md](ELECTRON.md)** - Kompletní návod pro desktop aplikaci
- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Kontrolní seznam pro setup
- **[FILE_MANIFEST.md](FILE_MANIFEST.md)** - Přehled všech souborů
- **[server/README.md](server/README.md)** - Backend API dokumentace
- **[SETUP.html](SETUP.html)** - Interaktivní průvodce

---

## 📝 Poznámky

- Backend automaticky inicializuje databázi a vytvoří všechny potřebné tabulky
- Frontend má dva módy: online (s backendem) a offline (IndexedDB)
- Desktop aplikace spouští backend automaticky jako child process
- Backup funkce umožňuje export/import dat v JSON formátu
- Aplikace je plně responsive a funguje na mobilních zařízeních

---

## 🎉 RevizeApp je připravena!

**Webová verze:** `npm run dev` a otevřete http://localhost:5173  
**Desktop verze:** `.\run-electron.bat` (Windows) nebo `./run-electron.sh` (Linux/Mac)

Pro build desktop aplikace: `.\build-electron.bat`
