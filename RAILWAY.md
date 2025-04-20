# Despliegue en Railway

Este documento contiene instrucciones para desplegar la aplicación en Railway.app.

## Requisitos

- Cuenta en Railway.app
- Repositorio de GitHub con el código de la aplicación

## Pasos para desplegar

1. Inicia sesión en [Railway.app](https://railway.app)
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu cuenta de GitHub y selecciona el repositorio
5. Railway detectará automáticamente la configuración de Node.js
6. Configura las variables de entorno (ver sección siguiente)
7. Haz clic en "Deploy" para iniciar el despliegue

## Variables de entorno

Configura las siguientes variables de entorno en Railway:

```
PORT=10000
NODE_ENV=production
CACHE_TTL=300
CACHE_CHECK_PERIOD=60
MAX_CONCURRENT_PROCESSING=2
PDF_PROCESSING_TIMEOUT=300
MONGODB_URI=mongodb+srv://venahof354:qgTo6WkrarDMfM3k@feedback.k8tz92x.mongodb.net/?retryWrites=true&w=majority&appName=FeedBack
PDF_MONGODB_URI=mongodb+srv://xxleoxx2175:ipj3RG8FkPD8n6kq@pdfsfeedback.omghpst.mongodb.net/PDFs?retryWrites=true&w=majority
GEMINI_API_KEY=AIzaSyAEzl_JpUv0PrqwFQG1mxZyG7vjS2_Vv_E
LLMWHISPERER_API_KEY=4KjptuSzKr5nL_BYnA7eJO9IUmiTXCuVx37U1_QiMSo
LLMWHISPERER_BASE_URL_V2=https://llmwhisperer-api.us-central.unstract.com/api/v2
JWT_SECRET=feedback_system_secret_key_production
REDIS_ENABLED=false
```

## Configuración de Netlify (Frontend)

Después de desplegar el backend en Railway, actualiza la configuración de tu frontend en Netlify:

1. Inicia sesión en tu cuenta de Netlify
2. Ve a tu sitio de Netlify
3. Ve a "Site settings" > "Build & deploy" > "Environment variables"
4. Actualiza la variable `REACT_APP_API_URL` con la nueva URL de tu backend en Railway:
   - `REACT_APP_API_URL=https://tu-app.railway.app/api`
5. Guarda los cambios
6. Ve a "Deploys" y haz clic en "Trigger deploy" > "Deploy site" para volver a desplegar tu frontend con la nueva configuración

## Optimizaciones implementadas

- Reducción del número de workers para procesamiento de PDFs
- Umbrales más bajos para detección de sobrecarga del sistema
- Timeouts reducidos para procesamiento de PDFs
- Mayor tiempo de caché para reducir procesamiento repetido
- Desactivación de Redis para reducir uso de recursos
