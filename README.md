# Sistema de Supervisión Efectiva con Procesamiento de PDF

Este sistema permite procesar formularios PDF de supervisión efectiva, extraer su contenido y mantener una conversación interactiva con una IA sobre el análisis del documento. Ahora incluye procesamiento de PDF directamente en el navegador sin necesidad de APIs externas.

## Requisitos Previos

### Para el modo servidor (opcional)
1. Node.js 14.x o superior
2. NPM 6.x o superior
3. Cuenta en MongoDB Atlas
4. Cuenta en Google Cloud para API de Gemini (opcional)

### Para el modo navegador (recomendado)
1. Navegador moderno con soporte para JavaScript ES6
2. No requiere cuentas externas ni APIs

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

2. Instalar las dependencias del servidor (opcional para modo servidor):
```bash
cd server
npm install
```

3. Instalar las dependencias del cliente:
```bash
cd ../client
npm install
```

4. Configurar las variables de entorno (opcional para modo servidor):
   - Crear un archivo `.env` en la carpeta `server` con las siguientes variables:
   ```
   PORT=5009
   MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/feedback-system
   PDF_MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/PDFeedBack
   ```

5. Iniciar el servidor (opcional para modo servidor):
```bash
cd ../server
npm start
```

6. Iniciar el cliente:
```bash
cd ../client
npm start
```

## Uso del Sistema

### Procesamiento de PDF en el navegador (recomendado)

1. Acceder al sistema:
   - Abrir el navegador y visitar `http://localhost:3000`

2. Procesar un archivo PDF:
   - Ir a la sección "Supervisión Efectiva"
   - Seleccionar la pestaña "Procesar en Navegador"
   - Hacer clic en "Seleccionar archivo" y elegir un PDF
   - Hacer clic en "Procesar PDF" o "Analizar PDF"
   - Una vez procesado, puedes guardar el resultado con un título personalizado

3. Ver documentos procesados:
   - Los documentos procesados se muestran en una tabla debajo del procesador
   - Puedes eliminar documentos que ya no necesites

### Procesamiento de PDF en el servidor (opcional)

1. Subir un archivo PDF:
   - Seleccionar la pestaña "Procesar en Servidor"
   - Completar título y descripción
   - Seleccionar un archivo PDF
   - Hacer clic en "Subir Archivo"

2. Interactuar con el chat:
   - Hacer clic en el icono de chat junto al documento procesado
   - Hacer preguntas sobre el contenido del documento
   - La IA responderá basándose en el análisis del PDF

3. Gestionar archivos:
   - Ver lista de archivos subidos
   - Descargar archivos
   - Eliminar archivos

## Estructura del Proyecto

```
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── services/      # Servicios para API y procesamiento
│   │   └── App.js         # Componente principal
│   └── package.json     # Dependencias del cliente
├── server/                # Backend Node.js (opcional)
│   ├── controllers/     # Controladores de la API
│   ├── models/          # Modelos de la base de datos
│   ├── routes/          # Rutas de la API
│   ├── services/        # Servicios de procesamiento
│   └── app.js           # Aplicación principal
└── .env                  # Variables de entorno
```

## Ventajas del procesamiento en el navegador

- **Sin dependencias externas**: No requiere APIs externas ni servicios de terceros
- **Privacidad**: Los PDFs se procesan localmente, sin enviar datos a servidores externos
- **Despliegue sencillo**: Puede desplegarse en cualquier hosting web estático
- **Rendimiento**: Aprovecha el poder de procesamiento del dispositivo del usuario

## Solución de Problemas

1. Si el procesamiento en el navegador es lento:
   - Intentar con un PDF más pequeño
   - Verificar que el navegador esté actualizado
   - Cerrar otras pestañas o aplicaciones para liberar memoria

2. Si la detección de casillas no es precisa:
   - Asegurarse de que el PDF tenga buena calidad
   - Las casillas deben tener buen contraste con el fondo
   - Probar con diferentes escalas de procesamiento

3. Si el modo servidor no funciona:
   - Verificar la conexión a MongoDB Atlas
   - Comprobar que las variables de entorno estén configuradas correctamente
   - Revisar los logs del servidor para mensajes de error

## Notas Importantes

- Los archivos PDF deben estar en formato legible
- El sistema está optimizado para documentos con casillas marcadas
- Se recomienda no subir archivos muy grandes (>10MB)
- El almacenamiento local tiene límites de capacidad según el navegador

## Despliegue en Render

Este proyecto está configurado para un fácil despliegue en Render.com.

### Pasos para desplegar:

1. Crear una cuenta en [Render](https://render.com)
2. Conectar tu repositorio de GitHub
3. Usar el archivo `render.yaml` para configurar los servicios
4. Configurar las variables de entorno en el dashboard de Render

### Variables de entorno requeridas:

- `NODE_ENV`: Establecer como "production"
- `MONGODB_URI`: URL de conexión a MongoDB Atlas
- `PDF_MONGODB_URI`: URL de conexión a la base de datos de PDFs
- `JWT_SECRET`: Clave secreta para tokens JWT
- `GEMINI_API_KEY`: API key de Google Gemini
- `LLMWHISPERER_API_KEY`: API key de LLMWhisperer
- `LLMWHISPERER_BASE_URL_V2`: URL base de la API de LLMWhisperer