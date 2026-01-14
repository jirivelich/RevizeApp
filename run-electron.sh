#!/bin/bash
# Spustit Electron aplikaci v dev módu

echo "========================================"
echo "  RevizeApp - Electron Development"
echo "========================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "Instaluji frontend závislosti..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "Instaluji backend závislosti..."
    cd server
    npm install
    cd ..
fi

echo ""
echo "Spouštím aplikaci v development módu..."
echo ""
echo "- Vite dev server: http://localhost:5173"
echo "- Backend API: http://localhost:3001"
echo "- Electron okno se otevře automaticky"
echo ""
echo "Stiskni Ctrl+C pro zastavení"
echo ""

npm run electron:dev
