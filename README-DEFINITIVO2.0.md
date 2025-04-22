# Sistema de Feedback - Versión 2.0 (Optimizada)

Esta es la versión optimizada del Sistema de Feedback, con mejoras significativas en el rendimiento y la capacidad de procesamiento de PDFs.

## Mejoras implementadas

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

## Despliegue

El sistema está configurado para ser desplegado en:

- **Frontend**: Netlify
- **Backend**: Render

### URLs de producción

- **Frontend**: [https://sermalite-feedback.netlify.app](https://sermalite-feedback.netlify.app)
- **Backend**: [https://sermalite-feedback-api.onrender.com](https://sermalite-feedback-api.onrender.com)

## Instalación local

1. Clonar el repositorio:
   ```
   git clone https://github.com/XxLXx2211/Feedback.git
   cd Feedback
   git checkout definitivo2.0
   ```

2. Instalar dependencias:
   ```
   npm run install-all
   ```

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env` en la raíz del proyecto
   - Copiar `client/.env.example` a `client/.env`
   - Copiar `server/.env.example` a `server/.env`
   - Editar los archivos `.env` con las configuraciones necesarias

4. Aplicar optimizaciones:
   ```
   npm run optimize
   ```

5. Iniciar el servidor y el cliente:
   ```
   npm run dev
   ```

## Documentación adicional

Para más información sobre las optimizaciones implementadas, consulte el archivo [OPTIMIZACIONES.md](OPTIMIZACIONES.md).

## Requisitos del sistema

- Node.js 16.x o superior
- MongoDB 4.4 o superior
- Redis 6.x o superior (opcional, pero recomendado para mejor rendimiento)

## Licencia

Este proyecto es propiedad de Sermalite. Todos los derechos reservados.
