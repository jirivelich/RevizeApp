@echo off
REM Build Electron aplikace pro Windows

echo ========================================
echo  RevizeApp - Windows Build
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
echo Buildim aplikaci pro Windows...
echo.

call npm run electron:build:win

echo.
echo ========================================
echo  Build dokoncen!
echo ========================================
echo.
echo Instalacni soubory najdete v: release\
echo.

pause
