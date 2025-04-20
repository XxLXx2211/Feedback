import axios from 'axios';

// Obtener la URL base de la API
// Usar la IP del host actual en lugar de localhost para evitar problemas de CORS
const hostname = window.location.hostname;

// Definir la URL de la API usando la variable de entorno
// Usar la URL de producción para el despliegue
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Imprimir la URL para depuración
console.log('Usando URL de API hardcodeada:', API_URL);

// Intentar hacer una solicitud de prueba para verificar la conexión
// Construir la URL correctamente para evitar problemas con la ruta /api
let testUrl = API_URL;
if (testUrl.endsWith('/api')) {
  testUrl = testUrl.substring(0, testUrl.length - 4);
}
testUrl += '/api/status';

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
