const mongoose = require('mongoose');

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

    console.log(`Intentando conectar a la base de datos de PDFs: ${PDF_MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Opciones de conexión mejoradas
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 segundos de timeout
      socketTimeoutMS: 45000, // 45 segundos para operaciones
      connectTimeoutMS: 30000, // 30 segundos para la conexión inicial
      family: 4, // Forzar IPv4
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 1
    };

    // Crear una conexión separada para la base de datos de PDFs
    pdfConnection = await mongoose.createConnection(PDF_MONGODB_URI, connectionOptions);

    console.log('Conexión exitosa a la base de datos de PDFs');
    return pdfConnection;
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
