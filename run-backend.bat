@echo off
REM Spustit backend RevizeApp

cd server

if not exist "node_modules" (
    echo Instaluji zavislosti...
    call npm install
)

echo.
echo ========================================
echo  RevizeApp Backend Server
echo ========================================
echo.
echo Spouštíme backend...
echo Server bude dostupný na http://localhost:3001
echo Zdravotní kontrola: http://localhost:3001/api/health
echo.
echo Stiskni Ctrl+C pro zastavení serveru
echo.

call npm run dev

pause
