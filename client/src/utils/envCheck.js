/**
 * Utilidad para verificar las variables de entorno en el cliente
 */

// Imprimir las variables de entorno disponibles para el cliente
export const checkEnvironmentVariables = () => {
  console.log('=== VARIABLES DE ENTORNO DEL CLIENTE ===');
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Obtener el hostname actual
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Verificar si la variable REACT_APP_API_URL está definida
  if (!process.env.REACT_APP_API_URL) {
    console.warn('⚠️ ADVERTENCIA: REACT_APP_API_URL no está definida');
    console.warn(`La aplicación usará la URL por defecto: http://${hostname}:5000/api`);
  } else {
    console.log('✅ REACT_APP_API_URL está definida correctamente');
  }

  return {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || `http://${hostname}:5000/api`,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
};

export default checkEnvironmentVariables;
