@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   RevizeApp - Portable EXE Builder
echo ============================================
echo.

REM Vytvoří release adresář
set "ReleaseDir=%~dp0release"
if exist "%ReleaseDir%" rmdir /s /q "%ReleaseDir%"
mkdir "%ReleaseDir%"

echo 📦 Balím aplikaci...
echo.

REM Zkopíruje všechny potřebné soubory
echo Kopíruji dist...
xcopy /E /I /Y "dist" "%ReleaseDir%\RevizeApp\dist" >nul
echo Kopíruji server...
xcopy /E /I /Y "server" "%ReleaseDir%\RevizeApp\server" /EXCLUDE:exclude.txt >nul
echo Kopíruji launcher a config...
copy /Y "launcher.bat" "%ReleaseDir%\RevizeApp\" >nul
copy /Y "package.json" "%ReleaseDir%\RevizeApp\" >nul
copy /Y "README.md" "%ReleaseDir%\RevizeApp\" >nul

REM Vytvoří data adresář
mkdir "%ReleaseDir%\RevizeApp\server\data" 2>nul

echo.
echo ✅ Struktura aplikace:
echo.
dir /B "%ReleaseDir%\RevizeApp"
echo.

REM Vytvoří 7z archiv
if exist "%ProgramFiles%\7-Zip\7z.exe" (
    echo 🔨 Balím do 7z...
    cd /d "%ReleaseDir%"
    "%ProgramFiles%\7-Zip\7z.exe" a -r RevizeApp-1.0.0.7z RevizeApp >nul
    
    if exist "RevizeApp-1.0.0.7z" (
        echo ✅ Archiv vytvořen: %ReleaseDir%\RevizeApp-1.0.0.7z
        echo.
    )
)

REM Vytvoří ZIP
echo 📦 Balím do ZIP...
cd /d "%ReleaseDir%"
powershell -Command "Compress-Archive -Path 'RevizeApp' -DestinationPath 'RevizeApp-1.0.0.zip' -Force"

if exist "RevizeApp-1.0.0.zip" (
    echo ✅ ZIP vytvořen: %ReleaseDir%\RevizeApp-1.0.0.zip
    echo.
)

echo.
echo ============================================
echo   ✅ Hotovo!
echo ============================================
echo.
echo Distribuční soubory:
echo   - %ReleaseDir%\RevizeApp (adresář aplikace)
echo   - %ReleaseDir%\RevizeApp-1.0.0.zip (ZIP archiv)
if exist "%ReleaseDir%\RevizeApp-1.0.0.7z" echo   - %ReleaseDir%\RevizeApp-1.0.0.7z (7z archiv)
echo.
echo Spuštění:
echo   1. Rozbalte RevizeApp-1.0.0.zip
echo   2. Spusťte launcher.bat
echo   3. Aplikace se otevře v prohlížeči
echo.
echo Poznámka: Vyžaduje Node.js v22+
echo.
pause
