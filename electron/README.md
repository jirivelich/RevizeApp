# RevizeApp - Electron Desktop Application

**Electron aplikace je připravena!** 🎉

## ⚡ Rychlý start

### Spustit aplikaci (development):

```bash
.\run-electron.bat
```

Po dokončení `npm install` (běží na pozadí) se aplikace automaticky spustí.

---

## 📋 Co je hotovo:

✅ **Electron wrapper**
- Hlavní proces s backend integrací
- Preload script pro bezpečnost
- Nativní menu s českými popisky
- Auto-start backendu jako child process

✅ **Build konfigurace**
- Windows (.exe)
- macOS (.dmg)
- Linux (.AppImage, .deb)

✅ **Skripty**
- `run-electron.bat` - Spustit (Windows)
- `run-electron.sh` - Spustit (Linux/Mac)
- `build-electron.bat` - Build instalátor

✅ **Frontend integrace**
- Electron API wrapper
- Detekce Electron prostředí
- Menu event handlery

---

## 🎨 TODO: Ikony

Momentálně je použita placeholder ikona (SVG).

Pro produkční build vytvořte ikony:
- **Windows:** `electron/icon.ico` (256x256)
- **macOS:** `electron/icon.icns`
- **Linux:** `electron/icon.png` (512x512)

Návod: [electron/ICONS.md](ICONS.md)

---

## 📦 Build pro produkci:

```bash
.\build-electron.bat
```

Výstup: `release/RevizeApp Setup 1.0.0.exe`

---

## 📖 Dokumentace:

- **[ELECTRON.md](../ELECTRON.md)** - Kompletní dokumentace
- **[README.md](../README.md)** - Celý projekt

---

**Aplikace je připravena k použití!** 🚀

Spusťte: `.\run-electron.bat`
