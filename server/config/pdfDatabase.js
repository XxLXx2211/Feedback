const mongoose = require('mongoose');

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

// Variable para almacenar la conexión
let pdfConnection = null;

// Conexión a la base de datos específica para PDFs
const connectPDFDatabase = async () => {
  // Si ya tenemos una conexión activa, la devolvemos
  if (pdfConnection && pdfConnection.readyState === 1) {
    console.log('Usando conexión existente a la base de datos de PDFs');
    return pdfConnection;
  }

  try {
    // Obtener la URI directamente de process.env
    const PDF_MONGODB_URI = process.env.PDF_MONGODB_URI;

    if (!PDF_MONGODB_URI) {
      throw new Error('La variable de entorno PDF_MONGODB_URI no está definida. Esta variable es necesaria para conectarse a la base de datos de PDFs.');
    }

    console.log(`Intentando conectar a la base de datos de PDFs...`);
    console.log(`URI: ${PDF_MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Intentar conectar directamente con Mongoose
    console.log('Intentando conectar con Mongoose para PDFs...');

    // Sistema de reintentos mejorado
    let retries = 5; // Aumentado a 5 intentos
    let lastError = null;

    // Opciones de conexión optimizadas para alto rendimiento con PDFs
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000, // 30 segundos para la selección del servidor
      socketTimeoutMS: 90000, // 90 segundos para operaciones de socket (aumentado para PDFs grandes)
      connectTimeoutMS: 30000, // 30 segundos para la conexión inicial
      maxPoolSize: 100, // Máximo de 100 conexiones en el pool (aumentado significativamente para PDFs)
      minPoolSize: 10, // Mínimo de 10 conexiones en el pool (aumentado)
      retryWrites: true,
      w: 'majority',
      keepAlive: true, // Mantener conexiones activas
      autoIndex: false, // Desactivar creación automática de índices (los creamos manualmente)
      bufferMaxEntries: 0, // Desactivar buffer de comandos cuando se desconecta
      useNewUrlParser: true,
      useUnifiedTopology: true,
      readPreference: 'secondaryPreferred', // Preferir lecturas de nodos secundarios para mejor rendimiento
      writeConcern: { w: 'majority', wtimeout: 10000 } // Asegurar que las escrituras se confirmen en la mayoría de nodos
    };

    while (retries > 0) {
      try {
        // Intentar la conexión con las opciones mejoradas
        pdfConnection = await mongoose.createConnection(PDF_MONGODB_URI, mongooseOptions);
        console.log('Conectado exitosamente a la base de datos de PDFs con Mongoose');

        // Configurar eventos de conexión
        pdfConnection.on('error', (err) => {
          console.error('Error en la conexión a la base de datos de PDFs:', err);
          // No cerramos la conexión aquí, dejamos que mongoose intente reconectar
        });

        pdfConnection.on('disconnected', () => {
          console.log('Base de datos de PDFs desconectada. Intentando reconectar...');
        });

        pdfConnection.on('reconnected', () => {
          console.log('Reconectado exitosamente a la base de datos de PDFs');
        });

        // Configurar manejo de reconexión automática
        pdfConnection.on('close', () => {
          console.log('Conexión a la base de datos de PDFs cerrada. Intentando reconectar...');
          // Intentar reconectar automáticamente
          setTimeout(async () => {
            try {
              if (!pdfConnection || pdfConnection.readyState !== 1) {
                // Usar las mismas opciones optimizadas para la reconexión
                const reconnectOptions = {
                  serverSelectionTimeoutMS: 30000,
                  socketTimeoutMS: 90000,
                  connectTimeoutMS: 30000,
                  maxPoolSize: 100,
                  minPoolSize: 10,
                  retryWrites: true,
                  w: 'majority',
                  keepAlive: true,
                  autoIndex: false,
                  bufferMaxEntries: 0,
                  useNewUrlParser: true,
                  useUnifiedTopology: true,
                  readPreference: 'secondaryPreferred',
                  writeConcern: { w: 'majority', wtimeout: 10000 }
                };
                pdfConnection = await mongoose.createConnection(PDF_MONGODB_URI, reconnectOptions);
                console.log('Reconectado exitosamente a la base de datos de PDFs');
              }
            } catch (reconnectError) {
              console.error('Error al reconectar a la base de datos de PDFs:', reconnectError);
            }
          }, 5000);
        });

        return pdfConnection;
      } catch (attemptError) {
        lastError = attemptError;
        retries--;

        if (retries > 0) {
          console.log(`Error al conectar a la base de datos de PDFs (intento ${3-retries}/3). Reintentando...`);
          console.error('Detalles del error:', attemptError.message);

          // Esperar 3 segundos antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('No se pudo conectar a la base de datos de PDFs después de varios intentos');
  } catch (error) {
    console.error('Error al conectar a la base de datos de PDFs:', error);
    pdfConnection = null;
    throw error;
  }
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await connectPDFDatabase();
    if (connection) {
      console.log('Conexión exitosa a MongoDB Atlas');
      // Probar creando una colección temporal
      const testCollection = connection.collection('test_connection');
      await testCollection.insertOne({ test: true, date: new Date() });
      console.log('Operación de escritura exitosa');
      await connection.close();
      console.log('Conexión cerrada');
      return true;
    } else {
      console.error('No se pudo establecer conexión');
      return false;
    }
  } catch (error) {
    console.error('Error al probar la conexión:', error);
    return false;
  }
};

module.exports = { connectPDFDatabase, testConnection };
