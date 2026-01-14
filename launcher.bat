@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo   RevizeApp - Spouštěním aplikace
echo ============================================
echo.

REM Kontrola Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ CHYBA: Node.js není nainstalován!
    echo Stáhněte si Node.js z: https://nodejs.org/
    pause
    exit /b 1
)

REM Kontrola npm
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ CHYBA: npm není nainstalován!
    pause
    exit /b 1
)

REM Instalace backendu pokud není
if not exist "server\node_modules" (
    echo 📦 Instaluji backend závislosti...
    cd server
    call npm install
    if errorlevel 1 (
        echo ❌ Selhala instalace závislostí!
        pause
        exit /b 1
    )
    cd ..
)

REM Vyčištění a build frontendu
echo 🔨 Builduju frontend...
call npm run build
if errorlevel 1 (
    echo ❌ Build selhal!
    pause
    exit /b 1
)

REM Start backendu v pozadí
echo 🚀 Spouštím backend server na http://localhost:3001
start "RevizeApp Backend" cmd /k "cd server && npm start"

REM Čekání na spuštění serveru
echo ⏳ Čekám na spuštění serveru...
timeout /t 3 /nobreak

REM Otevření aplikace v prohlížeči
echo 🌐 Otevírám aplikaci v prohlížeči...
start http://localhost:3001

echo.
echo ✅ Aplikace spuštěna!
echo    - Backend: http://localhost:3001
echo    - Frontend: http://localhost:3001
echo.
echo Zavřete toto okno pro zastavení aplikace.
pause
