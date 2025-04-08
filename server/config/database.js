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

    // Opciones de conexión mínimas para evitar problemas de compatibilidad
    const mongooseOptions = {}; // Sin opciones para usar los valores por defecto de Mongoose

    // Intentar conectar directamente con Mongoose
    console.log('Intentando conectar con Mongoose...');

    // Sistema de reintentos simplificado
    let retries = 3; // Reducido a 3 intentos para evitar esperas largas
    let lastError = null;

    while (retries > 0) {
      try {
        // Intentar la conexión con las opciones mínimas
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
          console.log(`Error al conectar a la base de datos principal (intento ${3-retries}/3). Reintentando...`);
          console.error('Detalles del error:', attemptError.message);

          // Esperar 3 segundos antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 3000));
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
