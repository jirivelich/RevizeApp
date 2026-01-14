# RevizeApp Backend Setup

## Požadavky

- Node.js 18+ 
- npm nebo yarn

## Instalace

```bash
cd server
npm install
```

## Spuštění

### Development s hot reload
```bash
npm run dev
```

### Production
```bash
npm start
```

Server běží na `http://localhost:3001`

## API Endpoints

### Zdravotní kontrola
- `GET /api/health` - Ověří, že server běží

### Revize
- `GET /api/revize` - Načti všechny revize
- `GET /api/revize/:id` - Načti konkrétní revizi
- `POST /api/revize` - Vytvoř novou revizi
- `PUT /api/revize/:id` - Aktualizuj revizi
- `DELETE /api/revize/:id` - Smaž revizi

### Rozvaděče
- `GET /api/rozvadece/:revizeId` - Načti rozvaděče pro konkrétní revizi
- `POST /api/rozvadece` - Vytvoř nový rozvaděč
- `DELETE /api/rozvadece/:id` - Smaž rozvaděč

### Nastavení
- `GET /api/nastaveni` - Načti nastavení aplikace
- `PUT /api/nastaveni` - Aktualizuj nastavení

### Backup
- `GET /api/backup` - Stáhni backup všech dat
- `POST /api/backup/import` - Importuj data z backupu

## Databáze

SQLite databáze je uložena v `server/data/revizeapp.db`

Obsahuje následující tabulky:
- revize
- rozvadec
- okruh
- zavada
- mistnost
- zarizeni
- zakazka
- mericiPristroj
- revizePristroj
- firma
- nastaveni
- sablona
- zavadaKatalog

## Frontend integrace

Frontend komunikuje s backendem přes `src/services/api.ts`

V `vite.config.ts` je nakonfigurován proxy pro development:
```
/api -> http://localhost:3001/api
```

## Proměnné prostředí

Vytvořit `.env.local` v rootu projektu:
```
VITE_API_URL=http://localhost:3001/api
```

## Spuštění celé aplikace

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Frontend je dostupný na `http://localhost:5173`
Backend je dostupný na `http://localhost:3001`
