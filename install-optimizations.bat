@echo off
REM Script para instalar las optimizaciones del Sistema de Feedback en Windows

echo === Instalando optimizaciones del Sistema de Feedback ===
echo.

REM Verificar si npm está instalado
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm no está instalado. Por favor, instale Node.js y npm primero.
    exit /b 1
)

echo 1. Instalando dependencias...
call npm install bull node-cache ioredis

echo.
echo 2. Verificando Redis...
REM Intentar conectar a Redis
where redis-cli >nul 2>nul
if %ERRORLEVEL% equ 0 (
    redis-cli ping >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo    ✅ Redis está instalado y funcionando correctamente.
    ) else (
        echo    ⚠️ Redis está instalado pero no está funcionando.
        echo       Las colas funcionarán en modo degradado.
        echo.
        echo    Para instalar Redis:
        echo    - Windows: Descargue desde https://github.com/microsoftarchive/redis/releases
        echo    - Docker: docker run --name redis -p 6379:6379 -d redis
    )
) else (
    echo    ⚠️ Redis no está instalado.
    echo       Las colas funcionarán en modo degradado.
    echo.
    echo    Para instalar Redis:
    echo    - Windows: Descargue desde https://github.com/microsoftarchive/redis/releases
    echo    - Docker: docker run --name redis -p 6379:6379 -d redis
)

echo.
echo 3. Creando índices en MongoDB...
call npm run create-indexes

echo.
echo 4. Verificando configuración...
REM Verificar si existe el archivo .env
if exist .env (
    echo    ✅ Archivo .env encontrado.
    
    REM Verificar si ya tiene las variables de optimización
    findstr /C:"CACHE_TTL" .env >nul
    if %ERRORLEVEL% equ 0 (
        echo    ✅ Variables de optimización ya configuradas en .env
    ) else (
        echo    ⚠️ Añadiendo variables de optimización al archivo .env...
        echo. >> .env
        echo # Configuración de optimizaciones >> .env
        echo CACHE_TTL=300 >> .env
        echo CACHE_CHECK_PERIOD=60 >> .env
        echo MAX_CONCURRENT_PROCESSING=8 >> .env
        echo PDF_PROCESSING_TIMEOUT=300 >> .env
        echo. >> .env
        echo # Configuración de Redis (opcional) >> .env
        echo REDIS_HOST=localhost >> .env
        echo REDIS_PORT=6379 >> .env
        echo REDIS_PASSWORD= >> .env
        echo REDIS_TLS=false >> .env
        echo    ✅ Variables añadidas correctamente.
    )
) else (
    echo    ⚠️ Archivo .env no encontrado. Creando uno nuevo...
    echo # Variables de entorno para el Sistema de Feedback > .env
    echo NODE_ENV=development >> .env
    echo PORT=5000 >> .env
    echo. >> .env
    echo # Configuración de MongoDB >> .env
    echo MONGODB_URI=mongodb://localhost:27017/feedback >> .env
    echo PDF_MONGODB_URI=mongodb://localhost:27017/feedback_pdf >> .env
    echo. >> .env
    echo # Configuración de optimizaciones >> .env
    echo CACHE_TTL=300 >> .env
    echo CACHE_CHECK_PERIOD=60 >> .env
    echo MAX_CONCURRENT_PROCESSING=8 >> .env
    echo PDF_PROCESSING_TIMEOUT=300 >> .env
    echo. >> .env
    echo # Configuración de Redis (opcional) >> .env
    echo REDIS_HOST=localhost >> .env
    echo REDIS_PORT=6379 >> .env
    echo REDIS_PASSWORD= >> .env
    echo REDIS_TLS=false >> .env
    echo    ✅ Archivo .env creado correctamente.
    echo    ⚠️ Por favor, configure las variables de conexión a MongoDB según su entorno.
)

echo.
echo 5. Verificando el estado del sistema...
call npm run monitor

echo.
echo === Optimizaciones instaladas correctamente ===
echo.
echo Para aplicar todas las optimizaciones, ejecute:
echo npm run optimize
echo.
echo Para más información, consulte el archivo OPTIMIZACIONES.md

pause
