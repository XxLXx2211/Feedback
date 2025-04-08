// Script para probar la conexión directa a MongoDB Atlas usando el cliente MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDBConnection() {
  console.log('=== PRUEBA DE CONEXIÓN DIRECTA A MONGODB ATLAS ===');
  
  // Obtener la URI de conexión
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: No se ha definido la variable de entorno MONGODB_URI');
    process.exit(1);
  }
  
  console.log(`Intentando conectar a: ${uri.replace(/:[^:]*@/, ':****@')}`);
  
  // Opciones de conexión
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  };
  
  const client = new MongoClient(uri, options);
  
  try {
    // Conectar al servidor
    await client.connect();
    console.log('✅ Conexión exitosa a MongoDB Atlas usando el cliente MongoDB directo');
    
    // Listar bases de datos disponibles
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    
    console.log('\nBases de datos disponibles:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Realizar una operación simple para verificar que todo funciona
    const database = client.db('feedback-system');
    const collection = database.collection('test_connection');
    
    // Insertar un documento de prueba
    const result = await collection.insertOne({
      test: true,
      message: 'Prueba de conexión exitosa',
      timestamp: new Date()
    });
    
    console.log(`\n✅ Documento insertado con ID: ${result.insertedId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB Atlas:', error);
    return false;
  } finally {
    // Cerrar la conexión
    await client.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la prueba
testMongoDBConnection()
  .then(success => {
    if (success) {
      console.log('\n=== RESUMEN ===');
      console.log('✅ La conexión directa a MongoDB Atlas funciona correctamente');
      process.exit(0);
    } else {
      console.log('\n=== RESUMEN ===');
      console.log('❌ No se pudo conectar a MongoDB Atlas');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error inesperado:', error);
    process.exit(1);
  });
