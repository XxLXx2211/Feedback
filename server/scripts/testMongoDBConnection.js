/**
 * Script para probar la conexión a MongoDB Atlas
 * 
 * Este script intenta conectarse a MongoDB Atlas usando las credenciales
 * configuradas en las variables de entorno y verifica si la conexión es exitosa.
 * 
 * Uso:
 * node scripts/testMongoDBConnection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('Iniciando prueba de conexión a MongoDB Atlas...');
  
  // Obtener la URI de MongoDB Atlas
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('Error: La variable de entorno MONGODB_URI no está definida');
    process.exit(1);
  }
  
  console.log(`URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
  
  // Opciones de conexión
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    family: 4
  };
  
  try {
    // Intentar conectar a MongoDB Atlas
    console.log('Intentando conectar...');
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    // Verificar el estado de la conexión
    console.log(`Estado de la conexión: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'No conectado'}`);
    
    // Probar operaciones básicas
    console.log('Probando operaciones básicas...');
    
    // Crear un modelo temporal para la prueba
    const TestModel = mongoose.model('TestConnection', new mongoose.Schema({
      test: String,
      date: { type: Date, default: Date.now }
    }));
    
    // Insertar un documento
    const testDoc = await TestModel.create({ test: 'Prueba de conexión', date: new Date() });
    console.log('Documento creado con ID:', testDoc._id);
    
    // Leer el documento
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log('Documento leído:', foundDoc.test);
    
    // Eliminar el documento
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('Documento eliminado');
    
    // Eliminar la colección de prueba
    await mongoose.connection.dropCollection('testconnections');
    console.log('Colección de prueba eliminada');
    
    console.log('¡Prueba completada con éxito! La conexión a MongoDB Atlas funciona correctamente.');
    
    // Cerrar la conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    
    return true;
  } catch (error) {
    console.error('Error al conectar a MongoDB Atlas:', error);
    return false;
  } finally {
    process.exit(0);
  }
}

// Ejecutar la prueba
testConnection();
