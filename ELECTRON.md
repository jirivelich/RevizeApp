# 🖥️ RevizeApp - Desktop (Electron)

## Přehled

RevizeApp je nyní dostupná jako desktopová aplikace pro **Windows**, **macOS** a **Linux**.

### ✨ Výhody desktopové verze

- ✅ **Samostatná aplikace** - Není potřeba prohlížeč
- ✅ **Lokální databáze** - SQLite databáze je přímo v aplikaci
- ✅ **Offline funkčnost** - Funguje bez připojení k internetu
- ✅ **Nativní menu** - Klávesové zkratky a nativní dialogy
- ✅ **Automatické aktualizace** - Budoucí funkce
- ✅ **Systémová integrace** - Tray ikona, notifikace

---

## 🚀 Spuštění v development módu

### Windows

```bash
.\run-electron.bat
```

Nebo manuálně:

```bash
npm install
cd server
npm install
cd ..
npm run electron:dev
```

### Linux / macOS

```bash
chmod +x run-electron.sh
./run-electron.sh
```

---

## 📦 Build pro produkci

### Windows (.exe)

```bash
.\build-electron.bat
```

Nebo:

```bash
npm run electron:build:win
```

**Výstup:**
- `release/RevizeApp Setup 1.0.0.exe` - Instalátor
- `release/RevizeApp 1.0.0.exe` - Portable verze

### macOS (.dmg)

```bash
npm run electron:build:mac
```

**Výstup:**
- `release/RevizeApp-1.0.0.dmg` - Instalátor pro macOS
- `release/RevizeApp-1.0.0-mac.zip` - ZIP archiv

### Linux (.AppImage, .deb)

```bash
npm run electron:build:linux
```

**Výstup:**
- `release/RevizeApp-1.0.0.AppImage` - Portable pro Linux
- `release/RevizeApp_1.0.0_amd64.deb` - Debian package

---

## 📁 Struktura

```
RevizeAppWeb/
├── electron/
│   ├── main.js              # Hlavní proces Electronu
│   ├── preload.js           # Preload script (bridge)
│   ├── icon.png             # Ikona aplikace (Linux)
│   ├── icon.ico             # Ikona aplikace (Windows)
│   └── icon.icns            # Ikona aplikace (macOS)
├── dist/                    # Build frontendu (Vite)
├── server/                  # Backend (Express + SQLite)
├── release/                 # Build výstupy (.exe, .dmg, atd.)
└── package.json             # Electron konfigurace
```

---

## ⚙️ Konfigurace

### package.json - Build nastavení

```json
{
  "build": {
    "appId": "cz.revizeapp.desktop",
    "productName": "RevizeApp",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "electron/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "electron/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "electron/icon.png"
    }
  }
}
```

---

## 🎨 Ikony

Pro správné buildy potřebujete ikony:

### Vytvoření ikon z PNG

**Windows (.ico):**
```bash
# Online nástroj: https://icoconvert.com/
# Nebo ImageMagick:
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**macOS (.icns):**
```bash
# macOS příkaz:
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
# ... další velikosti
iconutil -c icns icon.iconset
```

**Linux (.png):**
- Stačí PNG soubor 512x512px

---

## 🔧 API a databáze

### Backend integrace

Electron spouští backend server automaticky při startu aplikace:

```javascript
// electron/main.js
function startBackend() {
  backendProcess = spawn('node', ['--loader', 'ts-node/esm', 'server.ts'], {
    cwd: path.join(__dirname, '..', 'server'),
    env: { PORT: 3001 }
  });
}
```

### Databáze

SQLite databáze je uložena v:

- **Windows:** `%APPDATA%/RevizeApp/server/data/revizeapp.db`
- **macOS:** `~/Library/Application Support/RevizeApp/server/data/revizeapp.db`
- **Linux:** `~/.config/RevizeApp/server/data/revizeapp.db`

---

## 📋 Menu a klávesové zkratky

### Soubor
- `Ctrl+N` - Nová revize
- `Ctrl+E` - Export PDF
- `Ctrl+Q` - Ukončit

### Upravit
- `Ctrl+Z` - Zpět
- `Ctrl+Y` - Znovu
- `Ctrl+X` - Vyjmout
- `Ctrl+C` - Kopírovat
- `Ctrl+V` - Vložit
- `Ctrl+A` - Vybrat vše

### Zobrazení
- `Ctrl+R` - Reload
- `Ctrl+0` - Aktuální velikost
- `Ctrl++` - Přiblížit
- `Ctrl+-` - Oddálit
- `F11` - Celá obrazovka

### Nástroje
- `Ctrl+,` - Nastavení

---

## 🐛 Troubleshooting

### Backend se nespustí

Zkontroluj, že server dependencies jsou nainstalované:

```bash
cd server
npm install
cd ..
```

### Build selhává

**Windows:** Potřebujete Visual Studio Build Tools:
```bash
npm install --global windows-build-tools
```

**macOS:** Potřebujete Xcode Command Line Tools:
```bash
xcode-select --install
```

**Linux:** Potřebujete build-essential:
```bash
sudo apt-get install build-essential
```

### Aplikace nefunguje po buildu

1. Zkontroluj console logy: `%APPDATA%/RevizeApp/logs/`
2. Zkontroluj databázi: Je v `%APPDATA%/RevizeApp/server/data/`
3. Spusť v dev módu pro debugging: `npm run electron:dev`

---

## 🔄 Aktualizace

### Auto-update (budoucí funkce)

```javascript
// Přidat do electron/main.js
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

---

## 📝 Poznámky

- **První spuštění:** Aplikace může trvat déle (inicializace databáze)
- **Porty:** Backend běží na portu 3001, frontend je embedded
- **Velikost:** Instalátor ~150-200 MB (obsahuje Chromium runtime)
- **Performance:** Rychlejší než webová verze (nativní file system)

---

## 🚀 Deployment

### GitHub Releases

1. Tag release:
```bash
git tag v1.0.0
git push --tags
```

2. Build všechny platformy:
```bash
npm run electron:build:win
npm run electron:build:mac
npm run electron:build:linux
```

3. Upload do GitHub Releases

### Auto-build s GitHub Actions

Vytvořit `.github/workflows/build.yml` pro automatické buildy.

---

## ✅ Kontrolní seznam

- [x] Electron main process
- [x] Preload script pro bezpečnost
- [x] Backend integrace (child process)
- [x] Nativní menu s českými popisky
- [x] Build konfigurace pro Win/Mac/Linux
- [x] Startup skripty (run-electron.bat)
- [x] Build skripty (build-electron.bat)
- [ ] Ikony aplikace (vytvořit z loga)
- [ ] Code signing (Windows/macOS)
- [ ] Auto-update mechanismus
- [ ] GitHub Actions CI/CD

---

**RevizeApp je připravena jako desktopová aplikace! 🎉**

Spusťte `.\run-electron.bat` pro vyzkoušení.
