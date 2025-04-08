const mongoose = require('mongoose');
require('dotenv').config();

// Configurar conexión a MongoDB
const connectMainDatabase = async () => {
  try {
    // Usar MongoDB Atlas como base de datos principal
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-system';

    if (!MONGODB_URI) {
      throw new Error('No se ha definido la URL de conexión a MongoDB');
    }

    // Opciones de conexión mejoradas
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Timeout de 30 segundos
      socketTimeoutMS: 45000, // Timeout de 45 segundos para operaciones
      connectTimeoutMS: 30000, // Timeout de 30 segundos para la conexión inicial
      family: 4, // Forzar IPv4
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 1
    };

    console.log('Intentando conectar a la base de datos principal...');
    console.log(`URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Intentar conectar con reintentos
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log('Conectado exitosamente a la base de datos principal');
        return true;
      } catch (attemptError) {
        lastError = attemptError;
        retries--;

        if (retries > 0) {
          console.log(`Error al conectar a la base de datos principal (intento ${3-retries}/3). Reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos antes de reintentar
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
