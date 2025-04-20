const mongoose = require('mongoose');
require('dotenv').config();

// Configurar DNS para resolver problemas con MongoDB Atlas
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Priorizar IPv4 sobre IPv6

// Configurar variables de entorno para Node.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'; // Verificar certificados SSL
process.env.UV_THREADPOOL_SIZE = '64'; // Aumentar el tamaño del pool de threads

// Configurar mongoose para usar el nuevo parser de URL
mongoose.set('strictQuery', false); // Preparación para Mongoose 7

// Desactivar la validación estricta de esquemas
mongoose.set('strict', false);

// Permitir comandos en buffer mientras se establece la conexión
mongoose.set('bufferCommands', true);

// Configurar conexión a MongoDB
const connectMainDatabase = async () => {
  try {
    // Usar MongoDB Atlas como base de datos principal
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-system';

    if (!MONGODB_URI) {
      throw new Error('No se ha definido la URL de conexión a MongoDB');
    }

    console.log('Intentando conectar a la base de datos principal...');
    console.log(`URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Intentar conectar directamente con Mongoose
    console.log('Intentando conectar con Mongoose...');

    // Sistema de reintentos mejorado
    let retries = 5; // Aumentado a 5 intentos
    let lastError = null;

    // Opciones de conexión optimizadas para alto rendimiento
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000, // 30 segundos para la selección del servidor
      socketTimeoutMS: 60000, // 60 segundos para operaciones de socket (aumentado)
      connectTimeoutMS: 30000, // 30 segundos para la conexión inicial
      maxPoolSize: 50, // Máximo de 50 conexiones en el pool (aumentado significativamente)
      minPoolSize: 5, // Mínimo de 5 conexiones en el pool (aumentado)
      retryWrites: true,
      w: 'majority',
      keepAlive: true, // Mantener conexiones activas
      autoIndex: false // Desactivar creación automática de índices (los creamos manualmente)
    };

    while (retries > 0) {
      try {
        // Intentar la conexión con las opciones mejoradas
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log('Conectado exitosamente a la base de datos principal con Mongoose');

        // Configurar eventos de conexión para mejor manejo de errores
        mongoose.connection.on('error', (err) => {
          console.error('Error en la conexión a MongoDB:', err);
          // No cerramos la conexión aquí, dejamos que mongoose intente reconectar
        });

        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB desconectado. Intentando reconectar...');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('Reconectado exitosamente a MongoDB');
        });

        return true;
      } catch (attemptError) {
        lastError = attemptError;
        retries--;

        if (retries > 0) {
          console.log(`Error al conectar a la base de datos principal (intento ${5-retries}/5). Reintentando...`);
          console.error('Detalles del error:', attemptError.message);

          // Esperar tiempo progresivo antes de reintentar (3s, 6s, 9s, 12s)
          const waitTime = (5-retries) * 3000;
          console.log(`Esperando ${waitTime/1000} segundos antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('No se pudo conectar a la base de datos principal después de varios intentos');
  } catch (error) {
    console.error('Error al conectar a la base de datos principal:', error);
    throw error; // Propagar el error para que la aplicación falle si no puede conectarse
  }
};

module.exports = { connectMainDatabase };
