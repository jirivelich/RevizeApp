#!/bin/bash
# Linux/Mac startup script

echo "================================"
echo "  RevizeApp Backend Server"
echo "================================"
echo ""

cd server

if [ ! -d "node_modules" ]; then
    echo "Instalace závislostí..."
    npm install
fi

echo ""
echo "Spouštím backend..."
echo "Server bude dostupný na http://localhost:3001"
echo "Zdravotní kontrola: http://localhost:3001/api/health"
echo ""
echo "Stiskni Ctrl+C pro zastavení serveru"
echo ""

npm run dev
