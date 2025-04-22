# Optimizaciones del Sistema de Feedback

Este documento describe las optimizaciones implementadas para mejorar el rendimiento del sistema, especialmente en el procesamiento de PDFs.

## Optimizaciones implementadas

1. **Índices optimizados en MongoDB**
   - Índices específicos para consultas frecuentes
   - Índices compuestos para operaciones de ordenamiento
   - Índices de texto para búsquedas

2. **Configuración mejorada de conexiones a MongoDB**
   - Pool de conexiones ampliado (hasta 100 conexiones)
   - Timeouts optimizados para operaciones largas
   - Reconexión automática con reintentos exponenciales

3. **Sistema de caché**
   - Caché en memoria para consultas frecuentes
   - Invalidación automática de caché por tiempo
   - Invalidación selectiva por patrones de clave

4. **Procesamiento asíncrono de PDFs**
   - Cola de procesamiento con Bull y Redis
   - Procesamiento en paralelo según CPUs disponibles
   - Priorización de trabajos y reintentos automáticos

5. **Optimización de procesamiento de PDFs**
   - Streaming para archivos grandes
   - Ajuste automático de opciones según tamaño del archivo
   - Caché de resultados de procesamiento

6. **Monitoreo del sistema**
   - Verificación de carga de CPU y memoria
   - Estadísticas de procesamiento de PDFs
   - Endpoints para monitoreo del estado del sistema

## Cómo aplicar las optimizaciones

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear índices en MongoDB

```bash
npm run create-indexes
```

### 3. Verificar el estado del sistema

```bash
npm run monitor
```

### 4. Limpiar caché (si es necesario)

```bash
npm run clear-cache
```

### 5. Aplicar todas las optimizaciones

```bash
npm run optimize
```

## Configuración de Redis (opcional pero recomendado)

Para aprovechar al máximo el sistema de colas, se recomienda instalar Redis:

### Windows:
1. Descargar Redis para Windows desde https://github.com/microsoftarchive/redis/releases
2. Instalar y ejecutar el servicio

### Linux:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
```

### Docker:
```bash
docker run --name redis -p 6379:6379 -d redis
```

## Configuración avanzada

Para configurar aspectos avanzados, edite el archivo `.env` y añada las siguientes variables:

```
# Configuración de caché
CACHE_TTL=300
CACHE_CHECK_PERIOD=60

# Configuración de colas
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# Configuración de procesamiento de PDFs
MAX_CONCURRENT_PROCESSING=8
PDF_PROCESSING_TIMEOUT=300
```

## Monitoreo del sistema

Puede monitorear el estado del sistema accediendo a:

- `/api/monitor/status` - Estado básico del sistema
- `/api/monitor/system-info` - Información detallada (requiere autenticación de administrador)
- `/api/monitor/queues` - Estado de las colas de procesamiento (requiere autenticación de administrador)
- `/api/monitor/cache` - Estadísticas de caché (requiere autenticación de administrador)

## Solución de problemas

### El sistema se ralentiza al procesar muchos PDFs

1. Verifique la carga del sistema con `npm run monitor`
2. Si la carga es alta, considere:
   - Aumentar los recursos del servidor
   - Distribuir el procesamiento en varios servidores
   - Configurar un límite más bajo de procesamiento concurrente

### Errores de conexión a Redis

1. Verifique que Redis esté instalado y ejecutándose
2. Compruebe la configuración en el archivo `.env`
3. Si no tiene Redis, el sistema funcionará en modo degradado usando memoria

### Errores de memoria insuficiente

1. Aumente la memoria asignada al proceso Node.js:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```
2. Reduzca el número de trabajos concurrentes en `MAX_CONCURRENT_PROCESSING`
3. Limpie la caché regularmente con `npm run clear-cache`

## Rendimiento esperado

Con estas optimizaciones, el sistema debería poder manejar:

- **Sin Redis**: ~30-50 PDFs simultáneos
- **Con Redis**: ~100-200 PDFs simultáneos
- **Con configuración distribuida**: Varios cientos de PDFs

El rendimiento exacto dependerá de los recursos del servidor, el tamaño de los PDFs y la complejidad del procesamiento.
