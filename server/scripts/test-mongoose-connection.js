// Script para probar la conexión a MongoDB Atlas usando Mongoose
const mongoose = require('mongoose');
require('dotenv').config();

async function testMongooseConnection() {
  console.log('=== PRUEBA DE CONEXIÓN A MONGODB ATLAS USANDO MONGOOSE ===');
  
  // Obtener la URI de conexión
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: No se ha definido la variable de entorno MONGODB_URI');
    process.exit(1);
  }
  
  console.log(`Intentando conectar a: ${uri.replace(/:[^:]*@/, ':****@')}`);
  
  // Opciones de conexión para Mongoose
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
    // Probar sin directConnection: true para ver si ese es el problema
  };
  
  try {
    // Conectar usando Mongoose
    await mongoose.connect(uri, options);
    console.log('✅ Conexión exitosa a MongoDB Atlas usando Mongoose');
    
    // Crear un modelo simple para probar
    const TestModel = mongoose.model('TestConnection', new mongoose.Schema({
      message: String,
      timestamp: Date
    }));
    
    // Insertar un documento de prueba
    const testDoc = new TestModel({
      message: 'Prueba de conexión con Mongoose exitosa',
      timestamp: new Date()
    });
    
    const savedDoc = await testDoc.save();
    console.log(`\n✅ Documento guardado con ID: ${savedDoc._id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB Atlas con Mongoose:', error);
    return false;
  } finally {
    // Cerrar la conexión
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testMongooseConnection()
  .then(success => {
    if (success) {
      console.log('\n=== RESUMEN ===');
      console.log('✅ La conexión a MongoDB Atlas con Mongoose funciona correctamente');
      process.exit(0);
    } else {
      console.log('\n=== RESUMEN ===');
      console.log('❌ No se pudo conectar a MongoDB Atlas con Mongoose');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error inesperado:', error);
    process.exit(1);
  });
