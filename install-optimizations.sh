#!/bin/bash

# Script para instalar las optimizaciones del Sistema de Feedback

echo "=== Instalando optimizaciones del Sistema de Feedback ==="
echo ""

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "Error: npm no está instalado. Por favor, instale Node.js y npm primero."
    exit 1
fi

echo "1. Instalando dependencias..."
npm install bull node-cache ioredis

echo ""
echo "2. Verificando Redis..."
# Intentar conectar a Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "   ✅ Redis está instalado y funcionando correctamente."
    else
        echo "   ⚠️ Redis está instalado pero no está funcionando."
        echo "      Las colas funcionarán en modo degradado."
        echo ""
        echo "   Para instalar Redis:"
        echo "   - Windows: Descargue desde https://github.com/microsoftarchive/redis/releases"
        echo "   - Linux: sudo apt update && sudo apt install redis-server"
        echo "   - Docker: docker run --name redis -p 6379:6379 -d redis"
    fi
else
    echo "   ⚠️ Redis no está instalado."
    echo "      Las colas funcionarán en modo degradado."
    echo ""
    echo "   Para instalar Redis:"
    echo "   - Windows: Descargue desde https://github.com/microsoftarchive/redis/releases"
    echo "   - Linux: sudo apt update && sudo apt install redis-server"
    echo "   - Docker: docker run --name redis -p 6379:6379 -d redis"
fi

echo ""
echo "3. Creando índices en MongoDB..."
npm run create-indexes

echo ""
echo "4. Verificando configuración..."
# Verificar si existe el archivo .env
if [ -f .env ]; then
    echo "   ✅ Archivo .env encontrado."
    
    # Verificar si ya tiene las variables de optimización
    if grep -q "CACHE_TTL" .env; then
        echo "   ✅ Variables de optimización ya configuradas en .env"
    else
        echo "   ⚠️ Añadiendo variables de optimización al archivo .env..."
        cat >> .env << EOL

# Configuración de optimizaciones
CACHE_TTL=300
CACHE_CHECK_PERIOD=60
MAX_CONCURRENT_PROCESSING=8
PDF_PROCESSING_TIMEOUT=300

# Configuración de Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
EOL
        echo "   ✅ Variables añadidas correctamente."
    fi
else
    echo "   ⚠️ Archivo .env no encontrado. Creando uno nuevo..."
    cat > .env << EOL
# Variables de entorno para el Sistema de Feedback
NODE_ENV=development
PORT=5000

# Configuración de MongoDB
MONGODB_URI=mongodb://localhost:27017/feedback
PDF_MONGODB_URI=mongodb://localhost:27017/feedback_pdf

# Configuración de optimizaciones
CACHE_TTL=300
CACHE_CHECK_PERIOD=60
MAX_CONCURRENT_PROCESSING=8
PDF_PROCESSING_TIMEOUT=300

# Configuración de Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
EOL
    echo "   ✅ Archivo .env creado correctamente."
    echo "   ⚠️ Por favor, configure las variables de conexión a MongoDB según su entorno."
fi

echo ""
echo "5. Verificando el estado del sistema..."
npm run monitor

echo ""
echo "=== Optimizaciones instaladas correctamente ==="
echo ""
echo "Para aplicar todas las optimizaciones, ejecute:"
echo "npm run optimize"
echo ""
echo "Para más información, consulte el archivo OPTIMIZACIONES.md"
