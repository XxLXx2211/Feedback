// Script para probar la conexión directa a MongoDB Atlas sin usar SRV
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDirectConnection() {
  console.log('=== PRUEBA DE CONEXIÓN DIRECTA A MONGODB ATLAS (SIN SRV) ===');
  
  // Obtener la URI de conexión
  let uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: No se ha definido la variable de entorno MONGODB_URI');
    process.exit(1);
  }
  
  // Modificar la URI para usar conexión directa en lugar de SRV
  // Convertir de mongodb+srv:// a mongodb://
  if (uri.startsWith('mongodb+srv://')) {
    // Extraer las partes de la URI
    const uriParts = uri.replace('mongodb+srv://', '').split('/');
    const authPart = uriParts[0].split('@');
    const credentials = authPart[0];
    const host = authPart[1].split('?')[0];
    
    // Construir la nueva URI con el puerto 27017 (puerto estándar de MongoDB)
    const newUri = `mongodb://${credentials}@${host}:27017/?directConnection=true`;
    
    console.log('Convertida URI SRV a URI directa');
    console.log(`URI original: ${uri.replace(/:[^:]*@/, ':****@')}`);
    console.log(`URI modificada: ${newUri.replace(/:[^:]*@/, ':****@')}`);
    
    uri = newUri;
  }
  
  // Opciones de conexión
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    directConnection: true
  };
  
  const client = new MongoClient(uri, options);
  
  try {
    // Conectar al servidor
    await client.connect();
    console.log('✅ Conexión exitosa a MongoDB Atlas usando conexión directa');
    
    // Listar bases de datos disponibles
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    
    console.log('\nBases de datos disponibles:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
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
testDirectConnection()
  .then(success => {
    if (success) {
      console.log('\n=== RESUMEN ===');
      console.log('✅ La conexión directa a MongoDB Atlas funciona correctamente');
      process.exit(0);
    } else {
      console.log('\n=== RESUMEN ===');
      console.log('❌ No se pudo conectar a MongoDB Atlas usando conexión directa');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error inesperado:', error);
    process.exit(1);
  });
