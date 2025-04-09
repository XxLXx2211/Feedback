# Sistema de Feedback y Análisis de PDF (Versión JavaScript)

Este sistema permite gestionar evaluaciones de empleados y analizar documentos PDF con inteligencia artificial, desarrollado completamente en JavaScript.

## Características

- Gestión de empleados, departamentos y empresas
- Creación y administración de evaluaciones de feedback
- Análisis de documentos PDF con IA
- Chat interactivo para consultar información de los documentos
- Interfaz moderna con temas claro y oscuro

## Tecnologías

### Frontend
- React.js
- Bootstrap
- React Router
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- JWT para autenticación

### Servicios de IA
- API de Gemini (Google)
- LLMWhisperer para procesamiento de PDF (cliente JavaScript)

## Requisitos

- Node.js 14.x o superior
- NPM 6.x o superior
- Cuenta en Google Cloud para API de Gemini
- Cuenta en Unstract para LLMWhisperer

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/sistema-feedback.git
cd sistema-feedback
```

2. Instalar dependencias:
```bash
npm run install-all
```

3. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Agregar las siguientes variables:
   ```
   PORT=5000
   NODE_ENV=development
   GEMINI_API_KEY=tu_api_key_de_gemini
   LLMWHISPERER_API_KEY=tu_api_key_de_llmwhisperer
   ```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Uso

1. Acceder a la aplicación:
   - Abrir el navegador y visitar `http://localhost:3000`

2. Subir un archivo PDF:
   - Ir a la sección "Análisis PDF"
   - Hacer clic en "Seleccionar archivo"
   - Completar título y descripción
   - Hacer clic en "Subir Archivo"

3. Interactuar con el chat:
   - Hacer clic en el botón de chat junto al archivo
   - Hacer preguntas sobre el contenido del documento
   - La IA responderá basándose en el análisis del PDF

## Estructura del Proyecto

```
proyecto/
├── client/                  # Frontend React
│   ├── public/
│   └── src/
│       ├── components/      # Componentes React
│       ├── pages/           # Páginas principales
│       ├── contexts/        # Contextos (temas, auth)
│       └── services/        # Servicios API
│
├── server/                  # Backend Node.js
│   ├── controllers/         # Controladores
│   ├── models/              # Modelos MongoDB
│   ├── routes/              # Rutas API
│   ├── services/            # Servicios (PDF, IA)
│   └── uploads/             # Archivos subidos
│
├── .env                     # Variables de entorno
└── package.json             # Dependencias
```

## Ventajas de la Versión JavaScript

- **Facilidad de despliegue**: Las aplicaciones Node.js son mucho más fáciles de desplegar en la mayoría de los servicios de hosting web.
- **Consistencia tecnológica**: Usar JavaScript tanto en frontend como en backend simplifica el desarrollo y mantenimiento.
- **Rendimiento**: Node.js es conocido por su rendimiento y capacidad para manejar múltiples conexiones simultáneas.
- **Ecosistema robusto**: Hay una gran cantidad de bibliotecas y herramientas disponibles para Node.js.
- **Escalabilidad**: Las aplicaciones Node.js son fácilmente escalables.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
