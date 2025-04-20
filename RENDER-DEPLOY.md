# Guía de Despliegue en Render

Este documento proporciona instrucciones detalladas para desplegar la aplicación "Evaluación Semestral" en Render.

## Requisitos Previos

1. Una cuenta en [Render](https://render.com/)
2. Una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
3. Acceso al repositorio de código

## Configuración de MongoDB Atlas

1. **Configurar la lista blanca de IPs**:
   - En MongoDB Atlas, ve a "Network Access" en el menú lateral
   - Haz clic en "Add IP Address"
   - Selecciona "Allow Access from Anywhere" (esto añadirá `0.0.0.0/0`)
   - Haz clic en "Confirm"

2. **Obtener la URI de conexión**:
   - En MongoDB Atlas, ve a tu clúster
   - Haz clic en "Connect"
   - Selecciona "Connect your application"
   - Copia la URI de conexión (reemplaza `<password>` con tu contraseña real)

## Despliegue del Backend

1. **Crear un nuevo Web Service**:
   - En el Dashboard de Render, haz clic en "New" > "Web Service"
   - Conecta tu repositorio de GitHub
   - Configura el servicio:
     - **Name**: `evaluacion-semestral-api`
     - **Environment**: `Node`
     - **Branch**: `main` (o la rama que estés usando)
     - **Build Command**: `cd server && npm install`
     - **Start Command**: `cd server && node app.js`
     - **Plan**: Free

2. **Configurar Variables de Entorno**:
   - Haz clic en "Advanced" > "Environment Variables"
   - Añade las siguientes variables:
     - `NODE_ENV`: `production`
     - `MONGODB_URI`: `mongodb+srv://...` (tu URI de MongoDB Atlas)
     - `PDF_MONGODB_URI`: `mongodb+srv://...` (tu URI para la base de datos de PDFs)
     - `JWT_SECRET`: `tu_secreto_jwt`
     - `GEMINI_API_KEY`: `tu_api_key_de_gemini`
     - `LLMWHISPERER_API_KEY`: `tu_api_key_de_llmwhisperer`
     - `LLMWHISPERER_BASE_URL_V2`: `https://llmwhisperer-api.us-central.unstract.com/api/v2`
     - `PORT`: `10000`

3. **Crear el Servicio**:
   - Haz clic en "Create Web Service"
   - Espera a que se complete el despliegue

## Despliegue del Frontend

1. **Crear un nuevo Static Site**:
   - En el Dashboard de Render, haz clic en "New" > "Static Site"
   - Conecta tu repositorio de GitHub
   - Configura el sitio:
     - **Name**: `evaluacion-semestral-client`
     - **Branch**: `main` (o la rama que estés usando)
     - **Build Command**: `cd client && npm install && npm run build`
     - **Publish Directory**: `client/build`

2. **Configurar Variables de Entorno**:
   - Haz clic en "Advanced" > "Environment Variables"
   - Añade la siguiente variable:
     - `REACT_APP_API_URL`: URL del backend (ej. `https://evaluacion-semestral-api.onrender.com`)

3. **Configurar Redirecciones**:
   - En la sección "Redirects/Rewrites", añade:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`

4. **Crear el Sitio**:
   - Haz clic en "Create Static Site"
   - Espera a que se complete el despliegue

## Verificación del Despliegue

1. **Verificar el Backend**:
   - Accede a `https://evaluacion-semestral-api.onrender.com/api/status`
   - Deberías ver un mensaje JSON indicando que la API está funcionando

2. **Verificar el Frontend**:
   - Accede a `https://evaluacion-semestral-client.onrender.com`
   - Deberías ver la interfaz de usuario de la aplicación

## Solución de Problemas

### Problemas de Conexión a MongoDB

Si el backend no puede conectarse a MongoDB Atlas:

1. Verifica que la URI de MongoDB sea correcta
2. Asegúrate de que `0.0.0.0/0` esté en la lista blanca de IPs en MongoDB Atlas
3. Verifica los logs en Render para ver mensajes de error específicos

### Problemas con el Frontend

Si el frontend no puede comunicarse con el backend:

1. Verifica que `REACT_APP_API_URL` esté configurado correctamente
2. Asegúrate de que CORS esté configurado correctamente en el backend
3. Verifica la consola del navegador para ver mensajes de error específicos

## Mantenimiento

Para actualizar la aplicación después de cambios en el código:

1. Haz push de tus cambios a GitHub
2. En Render, ve a tu servicio
3. Haz clic en "Manual Deploy" > "Deploy latest commit"

---

Para más información, consulta la [documentación oficial de Render](https://render.com/docs).
