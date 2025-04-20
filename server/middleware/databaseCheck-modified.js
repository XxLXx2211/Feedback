/**
 * Middleware para verificar el estado de la conexión a la base de datos
 *
 * Este middleware verifica si hay una conexión activa a la base de datos
 * y responde con un mensaje de error si no hay conexión.
 */

const mongoose = require('mongoose');
const { connectMainDatabase } = require('../config/database');

// Middleware para verificar la conexión a la base de datos
const checkDatabaseConnection = (req, res, next) => {
  // En modo desarrollo, permitir continuar sin conexión a la base de datos
  if (process.env.NODE_ENV === 'development') {
    console.log('Modo desarrollo: Permitiendo acceso a API sin verificar conexión a la base de datos');
    return next();
  }

  // Verificar el estado de la conexión a la base de datos
  const isConnected = mongoose.connection.readyState === 1;

  // Si estamos conectados, continuar con la solicitud
  if (isConnected) {
    return next();
  }

  // Si no estamos conectados, intentar reconectar
  console.warn(`Base de datos no disponible (readyState: ${mongoose.connection.readyState}). Intentando reconectar...`);

  // Intentar reconectar a la base de datos
  connectMainDatabase()
    .then(() => {
      console.log('Reconectado exitosamente a la base de datos');
      next(); // Continuar con la solicitud después de reconectar
    })
    .catch(err => {
      console.error('Error al reconectar a la base de datos:', err.message);

      // Responder con error 503
      return res.status(503).json({
        error: 'database_unavailable',
        message: 'La base de datos no está disponible en este momento.',
        details: 'El servidor está intentando reconectar a la base de datos.',
        suggestion: 'Por favor, intenta de nuevo en unos momentos.'
      });
    });
};

module.exports = { checkDatabaseConnection };
