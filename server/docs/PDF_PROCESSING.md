# Procesamiento de PDF con LLMWhisperer

Este documento explica cómo funciona el procesamiento de PDF en el sistema utilizando el cliente LLMWhisperer en JavaScript.

## Configuración

Para utilizar la funcionalidad de procesamiento de PDF, es necesario configurar las siguientes variables de entorno:

```
LLMWHISPERER_API_KEY=tu_api_key_aquí
LLMWHISPERER_BASE_URL=https://llmwhisperer-api.us-central.unstract.com/api/v2
PDF_MONGODB_URI=mongodb+srv://usuario:contraseña@pdfeedback.mqpzq8u.mongodb.net/
```

## Flujo de procesamiento

1. **Subida del PDF**: El usuario sube un archivo PDF a través de la API.
2. **Almacenamiento**: El PDF se guarda en la base de datos MongoDB como un buffer.
3. **Procesamiento asíncrono**: Se inicia un procesamiento asíncrono del PDF utilizando LLMWhisperer.
4. **Análisis con IA**: Una vez procesado el PDF, se analiza el texto extraído utilizando la API de Gemini.
5. **Consulta**: El usuario puede consultar el análisis y chatear con el PDF utilizando la API.

## Modelo de datos optimizado

El modelo de datos para los documentos PDF ha sido optimizado para reducir el espacio utilizado en la base de datos:

- **t**: Título del documento (abreviado)
- **d**: Descripción del documento (abreviado)
- **f**: Nombre del archivo (abreviado)
- **p**: Ruta del archivo (abreviado)
- **s**: Estado del documento (abreviado)
  - **p**: Pendiente
  - **c**: Completado/Procesado
  - **e**: Error
- **tx**: Texto extraído del documento (abreviado)
- **a**: Análisis del documento (abreviado)
- **g**: Análisis generado por Gemini (abreviado)
- **pdf**: Contenido del PDF como buffer (más eficiente que base64)
- **conv**: Conversaciones con el documento (array de mensajes)
  - **m**: Mensaje
  - **u**: Si es del usuario (true) o de la IA (false)
  - **t**: Timestamp

## Scripts de utilidad

### Migración de datos

Para migrar los documentos PDF existentes al nuevo esquema optimizado:

```bash
npm run migrate-pdf
```

### Prueba de procesamiento

Para probar el procesamiento de un PDF sin necesidad de subir el archivo a través de la API:

```bash
npm run test-pdf ruta/al/archivo.pdf
```

## API

### Subir un PDF

```
POST /api/pdf/upload
```

Parámetros:
- **file**: Archivo PDF a subir
- **title**: Título del documento
- **description**: Descripción del documento (opcional)

### Obtener documentos

```
GET /api/pdf/documents
```

### Obtener un documento

```
GET /api/pdf/documents/:id
```

### Analizar un documento

```
POST /api/pdf/analyze/:id
```

### Chatear con un documento

```
POST /api/pdf/chat/:id
```

Parámetros:
- **message**: Mensaje del usuario

### Ver un PDF sin descargar

```
GET /api/pdf/view/:id
```

### Obtener análisis detallado

```
GET /api/pdf/analysis/:id
```

## Solución de problemas

### El procesamiento del PDF falla

- Verificar que la API key de LLMWhisperer sea válida
- Verificar que el archivo PDF sea válido y no esté corrupto
- Verificar los logs del servidor para obtener más información

### El análisis con Gemini falla

- Verificar que la API key de Gemini sea válida
- Verificar que el texto extraído del PDF no esté vacío
- Verificar los logs del servidor para obtener más información

### El chat no funciona

- Verificar que el documento haya sido procesado correctamente
- Verificar que el texto extraído del PDF no esté vacío
- Verificar los logs del servidor para obtener más información
