@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   RevizeApp - InnoSetup Builder
echo ============================================
echo.

REM Hledá InnoSetup
set "InnoSetupPath="
for /f "tokens=2*" %%A in ('reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 6_is1" /v InstallLocation 2^>nul') do set "InnoSetupPath=%%B"

if not defined InnoSetupPath (
    echo ❌ InnoSetup není nainstalován!
    echo Stáhněte si z: https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)

echo ✅ InnoSetup nalezen: %InnoSetupPath%

set "IsccPath=%InnoSetupPath%ISCC.exe"
set "ProjectDir=%~dp0"
set "OutputDir=%ProjectDir%release"

if not exist "%OutputDir%" mkdir "%OutputDir%"

echo.
echo 🔨 Budování instalátoru...
echo.

REM Kompiluje .iss do .exe
cd /d "%ProjectDir%"
call "%IsccPath%" /O"%OutputDir%" /F"RevizeApp-1.0.0-setup" "RevizeApp.iss"

if errorlevel 1 (
    echo ❌ Chyba kompilace!
    pause
    exit /b 1
)

echo.
if exist "%OutputDir%\RevizeApp-1.0.0-setup.exe" (
    echo ✅ Instalátor vytvořen!
    echo.
    echo Soubor: %OutputDir%\RevizeApp-1.0.0-setup.exe
    echo Velikost: 
    for %%A in ("%OutputDir%\RevizeApp-1.0.0-setup.exe") do echo %%~zA bajtů
    echo.
    echo Spuštění:
    echo   "%OutputDir%\RevizeApp-1.0.0-setup.exe"
    echo.
    pause
) else (
    echo ❌ Instalátor se nepodařilo vytvořit!
    pause
    exit /b 1
)
