# Ikony pro Electron aplikaci

## Požadované ikony

Pro build aplikace potřebujete následující ikony:

### Windows
- **icon.ico** - 256x256px, 128x128px, 64x64px, 48x48px, 32x32px, 16x16px
  - Formát: .ico multi-resolution

### macOS
- **icon.icns** - Apple Icon Image format
  - Obsahuje: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024

### Linux
- **icon.png** - 512x512px
  - Formát: PNG s průhledností

## Jak vytvořit ikony

### Postup:

1. **Vytvořte základní logo** (1024x1024px PNG s průhledným pozadím)

2. **Windows .ico:**
   - Online: https://icoconvert.com/
   - Nebo ImageMagick:
     ```bash
     convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
     ```

3. **macOS .icns:**
   - Na macOS:
     ```bash
     mkdir icon.iconset
     sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
     sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
     sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
     sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
     sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
     sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
     sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
     sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
     sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
     sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
     iconutil -c icns icon.iconset
     ```
   - Online: https://cloudconvert.com/png-to-icns

4. **Linux .png:**
   - Stačí PNG 512x512px s průhledným pozadím

## Placeholder ikony

Momentálně jsou použity placeholder ikony. Pro produkční build nahraďte:

- `electron/icon.png` - Vaše logo 512x512px
- `electron/icon.ico` - Windows ikona
- `electron/icon.icns` - macOS ikona

## Doporučení pro logo

- **Rozměry:** 1024x1024px (nejlépe vektorové SVG)
- **Průhlednost:** ANO (průhledné pozadí)
- **Styl:** Jednoduchý, čitelný i v malých velikostech
- **Barvy:** Kontrastní, dobře viditelné na světlém i tmavém pozadí
- **Detaily:** Minimální (detaily se ztratí v malých velikostech)

## Testování ikon

Po vytvoření ikon spusťte build:

```bash
npm run electron:build:win
```

Zkontrolujte, že ikona se správně zobrazuje v:
- Instalátoru
- Desktop zkratce
- Taskbaru/Docku
- Alt+Tab / Task Manager
