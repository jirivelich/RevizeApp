# ✅ RevizeApp Setup Checklist

## 📋 Preinstalace

- [ ] Node.js 18+ instalován (`node --version`)
- [ ] npm instalován (`npm --version`)
- [ ] Git instalován (volitelné)

## 🚀 Instalace a spuštění

### Varianata 1: Windows - Automaticky (DOPORUČENO)

```
1. Klikni 2x na `run-backend.bat` → otevří se terminal
2. Čekej na zprávu "RevizeApp Server běží na http://localhost:3001"
3. Otevři nový PowerShell v pracovní složce
4. Napiš: npm run dev
5. Otevři http://localhost:5173
```

**Kontrolní body:**
- [ ] run-backend.bat se spustil
- [ ] Backend zobrazuje zprávu o spuštění
- [ ] Frontend se zobrazuje na http://localhost:5173
- [ ] Žádné chyby v konzoli

### Varianta 2: Manuální instalace

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

**Kontrolní body:**
- [ ] Backend: "RevizeApp Server běží na http://localhost:3001"
- [ ] Frontend: "Local: http://localhost:5173"
- [ ] Oba terminály se nezavřely
- [ ] Žádné chyby

### Varianta 3: Linux/Mac

```bash
chmod +x run-backend.sh
./run-backend.sh

# V novém terminálu
npm run dev
```

**Kontrolní body:**
- [ ] Skripty se spustily bez chyb
- [ ] Backend běží na portu 3001
- [ ] Frontend běží na portu 5173

## 🧪 Ověření funkčnosti

### Health Check

```bash
# Otevři URL v prohlížeči
http://localhost:3001/api/health
```

**Očekávaný výstup:**
```json
{"status":"ok","message":"RevizeApp Server je spuštěný"}
```

- [ ] Health check odpovídá OK

### Frontend

```
http://localhost:5173
```

**Kontrola:**
- [ ] Stránka se načítá
- [ ] Hamburger menu funguje
- [ ] Navigace funguje
- [ ] Žádné chyby v konzoli (F12 → Console)

### Backend API

**Testování z terminálu (Linux/Mac):**

```bash
# Health check
curl http://localhost:3001/api/health

# GET revize
curl http://localhost:3001/api/revize

# GET nastavení
curl http://localhost:3001/api/nastaveni
```

**Testování z PowerShellu (Windows):**

```powershell
# Health check
Invoke-WebRequest http://localhost:3001/api/health

# GET revize
Invoke-WebRequest http://localhost:3001/api/revize
```

- [ ] API odpovídá na requesty
- [ ] Odpovědi jsou validní JSON

### Databáze

**Ověření existence:**

```bash
# Linux/Mac
ls -la server/data/

# Windows PowerShell
Get-Item server/data/revizeapp.db
```

- [ ] Soubor `revizeapp.db` existuje
- [ ] Velikost > 0 bytů

## 🔧 Konfigurace

### Frontend Environment

Zkontroluj `.env.local`:
```
VITE_API_URL=http://localhost:3001/api
```

- [ ] Soubor `.env.local` existuje
- [ ] VITE_API_URL je nastavena správně

### Backend Environment

Zkontroluj `server/.env`:
```
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

- [ ] Soubor `server/.env` existuje
- [ ] Všechny proměnné jsou nastaveny

### Vite Proxy

Zkontroluj `vite.config.ts` - měl by mít:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

- [ ] Proxy konfigurace existuje
- [ ] Target je http://localhost:3001

## 📦 Závislosti

### Frontend (`package.json`)
- [ ] react
- [ ] react-router-dom
- [ ] dexie (IndexedDB)
- [ ] jspdf (PDF export)
- [ ] tailwindcss

### Backend (`server/package.json`)
- [ ] express
- [ ] cors
- [ ] better-sqlite3
- [ ] body-parser
- [ ] typescript
- [ ] ts-node
- [ ] nodemon

## 🎯 Funkčnost

### Základní operace

- [ ] Zobrazení seznamu revizí
- [ ] Vytvoření nové revize
- [ ] Editace revize
- [ ] Smazání revize
- [ ] Export PDF
- [ ] Backup dat
- [ ] Restore z backupu

### Offline mód

- [ ] IndexedDB funguje offline
- [ ] Data se synchronizují s backendem
- [ ] Aplikace funguje bez internetu

### Mobilní

- [ ] Hamburger menu na mobilu
- [ ] Formuláře jsou čitelné na mobilním zařízení
- [ ] Tlačítka mají dostatečnou velikost (44x44px)

## 🐛 Pokud je něco špatně

### Backend se nespustí

```bash
# 1. Zkontroluj, že Node.js je nainstalován
node --version

# 2. Zkontroluj, že jsi v správné složce
cd server

# 3. Reinstaluj závislosti
rm -rf node_modules package-lock.json
npm install

# 4. Spusť znova
npm run dev
```

### Port 3001 je obsazený

**Windows:**
```powershell
# Najdi proces
netstat -ano | findstr :3001

# Zabij proces
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Najdi proces
lsof -i :3001

# Zabij proces
kill -9 <PID>
```

### Frontend se nenačítá

```bash
# Zkontroluj Vite proxy
cat vite.config.ts

# Reinstaluj
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### CORS chyba v konzoli

- [ ] Zkontroluj `server/.env` - CORS_ORIGIN
- [ ] Zkontroluj frontend URL - měl by být `http://localhost:5173`
- [ ] Zkontroluj vite.config.ts proxy konfiguraci

### Databáze je prázdná

```bash
# Smaž starou databázi
rm server/data/revizeapp.db

# Backend ji reinicializuje
npm run dev
```

## 📊 Status

**Komponenty:**
- [x] Frontend React aplikace
- [x] Backend Express server
- [x] SQLite databáze
- [x] REST API
- [x] Vite proxy
- [x] Startup skripty
- [x] Dokumentace
- [x] Testovací endpoints

**Funkčnost:**
- [x] CRUD operace
- [x] PDF export
- [x] Offline mód (IndexedDB)
- [x] Backup/Restore
- [x] Mobilní optimace
- [x] Responsive design

## ✅ Hotovo!

Pokud všechny checkboxy jsou zaškrtnuté, je aplikace plně funkční! 🎉

---

**Potřebuje-li pomoc:**
1. Zkontroluj GETTING_STARTED.md
2. Zkontroluj README.md
3. Zkontroluj server/README.md
4. Zkontroluj console v DevTools (F12)
5. Zkontroluj log v backendovém terminálu
