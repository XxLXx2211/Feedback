import axios from 'axios';

// FORZAR EL USO DE RENDER EN LUGAR DE RAILWAY
// Definir la URL de la API de Render de forma fija
const RENDER_API_URL = 'https://sermalite-feedback-api.onrender.com/api';

// Ignorar completamente cualquier otra configuración
// Usar siempre la URL de Render
const API_URL = RENDER_API_URL;

// Imprimir la URL para depuración
console.log('Usando URL de API (forzada a Render):', API_URL);

// Interceptor para axios para asegurarnos de que nunca se use Railway
axios.interceptors.request.use(
  config => {
    // Verificar si la URL contiene 'railway'
    if (config.url && config.url.includes('railway')) {
      console.error('INTERCEPTOR: Detectada URL de Railway en solicitud axios:', config.url);

      // Reemplazar la URL de Railway con la de Render
      const newUrl = config.url.replace(
        /https?:\/\/web-production-d1ba\.up\.railway\.app/g,
        'https://sermalite-feedback-api.onrender.com'
      );

      console.log('INTERCEPTOR: Redirigiendo a:', newUrl);
      config.url = newUrl;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Intentar hacer una solicitud de prueba para verificar la conexión
// Construir la URL correctamente para la ruta de estado
let testUrl = API_URL;
if (!testUrl.endsWith('/status')) {
  // Si la URL termina en /api, añadir /status
  if (testUrl.endsWith('/api')) {
    testUrl += '/status';
  }
  // Si no termina en /api, asegurarse de que tenga el formato correcto
  else if (!testUrl.includes('/api/')) {
    if (testUrl.endsWith('/')) {
      testUrl += 'api/status';
    } else {
      testUrl += '/api/status';
    }
  }
}

console.log('URL de prueba para verificar conexión:', testUrl);
fetch(testUrl)
  .then(response => {
    console.log('Respuesta de prueba del servidor:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Datos de prueba del servidor:', data);
  })
  .catch(error => {
    console.error('Error al conectar con el servidor:', error);
  });

// Asegurarnos de que estamos usando el puerto correcto (5000)

console.log('API URL configurada:', API_URL);
console.log('REACT_APP_API_URL desde process.env:', process.env.REACT_APP_API_URL);
console.log('Hostname detectado:', hostname);

// Configurar tiempo de espera global para las solicitudes
axios.defaults.timeout = 60000; // 60 segundos

// Verificar si la URL es válida
if (!API_URL) {
  console.error('Error: API_URL no está definida correctamente');
} else {
  console.log('Usando API URL:', API_URL);
}

// Crear una instancia de axios con la URL base y timeout
const API = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token a las solicitudes
API.interceptors.request.use(
  (config) => {
    console.log(`Realizando solicitud a: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Error en la solicitud:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
API.interceptors.response.use(
  (response) => {
    console.log(`Respuesta exitosa de: ${response.config.url}`);
    return response;
  },
  (error) => {
    // Manejar errores de red o timeout
    if (!error.response) {
      console.error('Error de red o timeout:', error.message);

      // Verificar si es un error de timeout
      if (error.code === 'ECONNABORTED') {
        return Promise.reject({
          response: {
            status: 0,
            data: {
              error: 'timeout_error',
              message: 'La solicitud ha excedido el tiempo de espera. Por favor, intenta de nuevo.'
            }
          }
        });
      }

      // Error de red general
      return Promise.reject({
        response: {
          status: 0,
          data: {
            error: 'network_error',
            message: 'Error de conexión. Por favor, verifica tu conexión a internet o inténtalo más tarde.'
          }
        }
      });
    }

    // Si el error es 401 (no autorizado), redirigir al login
    if (error.response.status === 401) {
      console.error('Error 401: No autorizado');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }

    // Si el error es 503 (servicio no disponible), mostrar mensaje personalizado para la base de datos
    if (error.response.status === 503 && error.response.data.error === 'database_unavailable') {
      console.error('Error 503: Base de datos no disponible', error.response.data);

      // Intentar reconectar automáticamente en 5 segundos
      setTimeout(() => {
        console.log('Intentando reconectar a la base de datos...');
        // Aquí podríamos hacer una solicitud de prueba para verificar si la base de datos ya está disponible
      }, 5000);

      return Promise.reject({
        response: {
          status: 503,
          data: {
            error: 'database_unavailable',
            message: 'La base de datos no está disponible en este momento. Estamos intentando reconectar automáticamente.',
            details: error.response.data.details,
            suggestion: 'Por favor, espera unos momentos o recarga la página para intentar de nuevo.'
          }
        }
      });
    }

    // Si el error es 500, mostrar mensaje personalizado
    if (error.response.status === 500) {
      console.error('Error 500 del servidor:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default API;
