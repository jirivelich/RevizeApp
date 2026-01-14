@echo off
REM Spustit Electron aplikaci v dev módu

echo ========================================
echo  RevizeApp - Electron Development
echo ========================================
echo.

if not exist "node_modules" (
    echo Instaluji frontend zavislosti...
    call npm install
)

if not exist "server\node_modules" (
    echo Instaluji backend zavislosti...
    cd server
    call npm install
    cd ..
)

echo.
echo Spoustim aplikaci v development modu...
echo.
echo - Vite dev server: http://localhost:5173
echo - Backend API: http://localhost:3001
echo - Electron okno se otevře automaticky
echo.
echo Stiskni Ctrl+C pro zastaveni
echo.

call npm run electron:dev
