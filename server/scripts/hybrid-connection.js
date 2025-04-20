// Script para probar una conexión híbrida a MongoDB Atlas
// Primero intenta con el cliente MongoDB directo, luego con Mongoose
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

async function testHybridConnection() {
  console.log('=== PRUEBA DE CONEXIÓN HÍBRIDA A MONGODB ATLAS ===');
  
  // Obtener la URI de conexión
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: No se ha definido la variable de entorno MONGODB_URI');
    process.exit(1);
  }
  
  console.log(`URI original: ${uri.replace(/:[^:]*@/, ':****@')}`);
  
  // Convertir la URI de SRV a directa si es necesario
  let directUri = uri;
  if (uri.startsWith('mongodb+srv://')) {
    // Extraer las partes de la URI
    const uriParts = uri.replace('mongodb+srv://', '').split('/');
    const authPart = uriParts[0].split('@');
    const credentials = authPart[0];
    const host = authPart[1].split('?')[0];
    
    // Construir la nueva URI con el puerto 27017 (puerto estándar de MongoDB)
    directUri = `mongodb://${credentials}@${host}:27017/?directConnection=true`;
    
    console.log('Convertida URI SRV a URI directa');
    console.log(`URI directa: ${directUri.replace(/:[^:]*@/, ':****@')}`);
  }
  
  // Opciones de conexión para el cliente MongoDB
  const clientOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    directConnection: true
  };
  
  // Opciones de conexión para Mongoose
  const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    family: 4,
    retryWrites: true,
    w: 'majority'
  };
  
  // Paso 1: Intentar con el cliente MongoDB directo usando la URI directa
  console.log('\n1. Intentando conectar con el cliente MongoDB directo (URI directa)...');
  try {
    const client = new MongoClient(directUri, clientOptions);
    await client.connect();
    console.log('✅ Conexión exitosa con el cliente MongoDB directo (URI directa)');
    await client.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('❌ Error al conectar con el cliente MongoDB directo (URI directa):', error.message);
    
    // Paso 2: Intentar con el cliente MongoDB directo usando la URI original
    console.log('\n2. Intentando conectar con el cliente MongoDB directo (URI original)...');
    try {
      const client = new MongoClient(uri, clientOptions);
      await client.connect();
      console.log('✅ Conexión exitosa con el cliente MongoDB directo (URI original)');
      await client.close();
      console.log('Conexión cerrada');
    } catch (error) {
      console.error('❌ Error al conectar con el cliente MongoDB directo (URI original):', error.message);
      
      // Paso 3: Intentar con Mongoose usando la URI directa
      console.log('\n3. Intentando conectar con Mongoose (URI directa)...');
      try {
        await mongoose.connect(directUri, mongooseOptions);
        console.log('✅ Conexión exitosa con Mongoose (URI directa)');
        await mongoose.disconnect();
        console.log('Conexión cerrada');
      } catch (error) {
        console.error('❌ Error al conectar con Mongoose (URI directa):', error.message);
        
        // Paso 4: Intentar con Mongoose usando la URI original
        console.log('\n4. Intentando conectar con Mongoose (URI original)...');
        try {
          await mongoose.connect(uri, mongooseOptions);
          console.log('✅ Conexión exitosa con Mongoose (URI original)');
          await mongoose.disconnect();
          console.log('Conexión cerrada');
        } catch (error) {
          console.error('❌ Error al conectar con Mongoose (URI original):', error.message);
          console.log('\n❌ Todos los intentos de conexión fallaron');
          return false;
        }
      }
    }
  }
  
  return true;
}

// Ejecutar la prueba
testHybridConnection()
  .then(success => {
    if (success) {
      console.log('\n=== RESUMEN ===');
      console.log('✅ Al menos uno de los métodos de conexión funcionó');
      process.exit(0);
    } else {
      console.log('\n=== RESUMEN ===');
      console.log('❌ Ninguno de los métodos de conexión funcionó');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error inesperado:', error);
    process.exit(1);
  });
