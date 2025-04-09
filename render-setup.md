# Configuración de Render después del despliegue

Después de desplegar tu aplicación en Render, sigue estos pasos para configurar las variables de entorno de forma segura (sin exponer tus API keys en GitHub):

## 1. Configura las variables de entorno para el backend (pdfeedback-api)

1. Ve al dashboard de Render
2. Selecciona el servicio "pdfeedback-api"
3. Haz clic en "Environment" en el menú lateral
4. Añade las siguientes variables de entorno:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://venahof354:qgTo6WkrarDMfM3k@feedback.k8tz92x.mongodb.net/?retryWrites=true&w=majority&appName=FeedBack
PDF_MONGODB_URI=mongodb+srv://xxleoxx2175:ipj3RG8FkPD8n6kq@pdfsfeedback.omghpst.mongodb.net/PDFs?retryWrites=true&w=majority
JWT_SECRET=feedback_system_secret_key
GEMINI_API_KEY=AIzaSyAEzl_JpUv0PrqwFQG1mxZyG7vjS2_Vv_E
LLMWHISPERER_API_KEY=4KjptuSzKr5nL_BYnA7eJO9IUmiTXCuVx37U1_QiMSo
LLMWHISPERER_BASE_URL_V2=https://llmwhisperer-api.us-central.unstract.com/api/v2
PORT=10000
```

5. Haz clic en "Save Changes"

## 2. Configura las variables de entorno para el frontend (pdfeedback-client)

1. Ve al dashboard de Render
2. Selecciona el servicio "pdfeedback-client"
3. Haz clic en "Environment" en el menú lateral
4. Añade la siguiente variable de entorno:

```
REACT_APP_API_URL=https://pdfeedback-api.onrender.com
```

5. Haz clic en "Save Changes"

## 3. Reinicia los servicios

1. Ve a cada servicio y haz clic en "Manual Deploy"
2. Selecciona "Deploy latest commit"

## 4. Verifica el despliegue

1. Accede a la URL del frontend (algo como https://pdfeedback-client.onrender.com)
2. Verifica que puedas acceder a la aplicación y que funcione correctamente
