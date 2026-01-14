@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   RevizeApp - WiX Installer Builder
echo ============================================
echo.

REM Hledá WiX v registry
set "WixPath="
for /f "tokens=2*" %%A in ('reg query "HKLM\Software\Microsoft\Windows Installer XML\3.11" /v InstallRoot 2^>nul') do set "WixPath=%%B"

if not defined WixPath (
    echo ❌ WiX Toolset není nainstalován!
    echo Stáhněte si z: https://wixtoolset.org/
    echo.
    echo Alternativně: Spusťte PowerShell jako administrátor a spusťte:
    echo   choco install wixtoolset -y
    echo.
    pause
    exit /b 1
)

echo ✅ WiX Toolset nalezen: %WixPath%
echo.

REM Nastaví cesty
set "CandlePath=%WixPath%bin\candle.exe"
set "LightPath=%WixPath%bin\light.exe"
set "HeatPath=%WixPath%bin\heat.exe"
set "ProjectDir=%~dp0"
set "OutputDir=%ProjectDir%release"

REM Vytvoří output složku
if not exist "%OutputDir%" mkdir "%OutputDir%"

echo 🔨 Budování instalátoru...
echo.

REM Kompiluje .wxs do .wixobj
echo Krok 1: Kompilace (candle.exe)...
cd /d "%ProjectDir%"
call "%CandlePath%" -d ProjectDir="%ProjectDir%" Product.wxs -o "%OutputDir%\Product.wixobj" -nologo

if errorlevel 1 (
    echo ❌ Chyba kompilace!
    pause
    exit /b 1
)

echo ✅ Kompilace hotova.
echo.

REM Linkuje .wixobj do .msi
echo Krok 2: Linkování (light.exe)...
call "%LightPath%" -cultures:en-us "%OutputDir%\Product.wixobj" -o "%OutputDir%\RevizeApp-1.0.0-installer.msi" -nologo

if errorlevel 1 (
    echo ❌ Chyba linkování!
    pause
    exit /b 1
)

echo ✅ Linkování hotovo.
echo.

REM Ověření výsledku
if exist "%OutputDir%\RevizeApp-1.0.0-installer.msi" (
    echo ✅ Instalátor vytvořen!
    echo.
    echo Soubor: %OutputDir%\RevizeApp-1.0.0-installer.msi
    echo.
    echo Můžete ho spustit příkazem:
    echo   msiexec /i "%OutputDir%\RevizeApp-1.0.0-installer.msi"
    echo.
    pause
) else (
    echo ❌ Instalátor se nepodařilo vytvořit!
    pause
    exit /b 1
)
