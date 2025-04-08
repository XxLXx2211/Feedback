require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const dns = require('dns').promises;

// Función para verificar la conexión a internet
async function checkInternetConnection() {
  console.log('\n=== Verificando conexión a internet ===');
  try {
    const response = await axios.get('https://www.google.com', { timeout: 5000 });
    console.log('✅ Conexión a internet: OK');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a internet:', error.message);
    return false;
  }
}

// Función para verificar la resolución DNS
async function checkDNS() {
  console.log('\n=== Verificando resolución DNS ===');
  try {
    const mongoHost = 'pdfeedback.mqpzq8u.mongodb.net';
    console.log(`Resolviendo DNS para ${mongoHost}...`);
    const addresses = await dns.resolve4(mongoHost);
    console.log('✅ Resolución DNS exitosa:', addresses);
    return true;
  } catch (error) {
    console.error('❌ Error de resolución DNS:', error.message);
    return false;
  }
}

// Función para verificar la conexión a MongoDB Atlas
async function checkMongoDBAtlasConnection() {
  console.log('\n=== Verificando conexión a MongoDB Atlas ===');
  
  const PDF_MONGODB_URI = process.env.PDF_MONGODB_URI;
  if (!PDF_MONGODB_URI) {
    console.error('❌ La variable de entorno PDF_MONGODB_URI no está definida');
    return false;
  }
  
  console.log(`URI: ${PDF_MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
  
  let connection = null;
  try {
    console.log('Intentando conexión directa a MongoDB Atlas...');
    connection = await mongoose.createConnection(PDF_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      family: 4
    });
    
    console.log('✅ Conexión a MongoDB Atlas establecida');
    console.log(`Estado de la conexión: ${connection.readyState}`);
    
    // Probar operaciones básicas
    console.log('Probando operaciones básicas...');
    const testCollection = connection.collection('test_diagnostico');
    const result = await testCollection.insertOne({ test: true, date: new Date(), message: 'Diagnóstico de conexión' });
    console.log('✅ Operación de escritura exitosa:', result.insertedId);
    
    // Leer el documento
    const doc = await testCollection.findOne({ _id: result.insertedId });
    console.log('✅ Operación de lectura exitosa:', doc ? 'Documento encontrado' : 'Documento no encontrado');
    
    // Eliminar el documento
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Operación de eliminación exitosa');
    
    await connection.close();
    console.log('Conexión cerrada');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB Atlas:', error);
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error al cerrar conexión:', closeError.message);
      }
    }
    return false;
  }
}

// Función para verificar el modelo PDFDocument
async function checkPDFDocumentModel() {
  console.log('\n=== Verificando modelo PDFDocument ===');
  
  try {
    const { initModel } = require('../models/PDFDocument');
    console.log('Inicializando modelo PDFDocument...');
    
    const PDFDocument = await initModel();
    
    if (!PDFDocument) {
      console.error('❌ No se pudo inicializar el modelo PDFDocument');
      return false;
    }
    
    console.log('✅ Modelo PDFDocument inicializado correctamente');
    
    // Verificar que el modelo tenga los métodos necesarios
    console.log('Verificando métodos del modelo...');
    const methods = ['find', 'findById', 'create', 'findByIdAndUpdate', 'findByIdAndDelete'];
    
    for (const method of methods) {
      if (typeof PDFDocument[method] !== 'function') {
        console.error(`❌ El método ${method} no está disponible en el modelo`);
        return false;
      }
    }
    
    console.log('✅ Todos los métodos necesarios están disponibles');
    
    // Intentar una operación de búsqueda
    console.log('Probando operación de búsqueda...');
    const docs = await PDFDocument.find().limit(5);
    console.log(`✅ Operación de búsqueda exitosa. Documentos encontrados: ${docs.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al verificar el modelo PDFDocument:', error);
    return false;
  }
}

// Función para verificar la API
async function checkAPI() {
  console.log('\n=== Verificando API ===');
  
  try {
    const baseURL = 'http://localhost:5001/api';
    
    // Verificar endpoint de estado
    console.log('Verificando endpoint de estado...');
    const statusResponse = await axios.get(`${baseURL}/status`, { timeout: 5000 });
    console.log('✅ Endpoint de estado OK:', statusResponse.data);
    
    // Verificar endpoint de documentos
    console.log('Verificando endpoint de documentos...');
    const documentsResponse = await axios.get(`${baseURL}/pdf/documents`, { timeout: 5000 });
    console.log('✅ Endpoint de documentos OK. Documentos:', Array.isArray(documentsResponse.data) ? documentsResponse.data.length : 'No es un array');
    
    return true;
  } catch (error) {
    console.error('❌ Error al verificar API:', error.message);
    if (error.response) {
      console.error('Detalles de la respuesta:', error.response.status, error.response.data);
    }
    return false;
  }
}

// Función principal
async function runDiagnostics() {
  console.log('=== INICIANDO DIAGNÓSTICO COMPLETO ===');
  console.log('Fecha y hora:', new Date().toLocaleString());
  
  // Verificar conexión a internet
  const internetOK = await checkInternetConnection();
  
  // Verificar DNS
  const dnsOK = await checkDNS();
  
  // Verificar conexión a MongoDB Atlas
  const mongoDBAtlasOK = await checkMongoDBAtlasConnection();
  
  // Verificar modelo PDFDocument
  const modelOK = await checkPDFDocumentModel();
  
  // Verificar API
  const apiOK = await checkAPI();
  
  // Resumen
  console.log('\n=== RESUMEN DEL DIAGNÓSTICO ===');
  console.log('Conexión a internet:', internetOK ? '✅ OK' : '❌ ERROR');
  console.log('Resolución DNS:', dnsOK ? '✅ OK' : '❌ ERROR');
  console.log('Conexión a MongoDB Atlas:', mongoDBAtlasOK ? '✅ OK' : '❌ ERROR');
  console.log('Modelo PDFDocument:', modelOK ? '✅ OK' : '❌ ERROR');
  console.log('API:', apiOK ? '✅ OK' : '❌ ERROR');
  
  const allOK = internetOK && dnsOK && mongoDBAtlasOK && modelOK && apiOK;
  console.log('\nDiagnóstico completo:', allOK ? '✅ TODO OK' : '❌ HAY PROBLEMAS');
  
  if (!allOK) {
    console.log('\nRecomendaciones:');
    if (!internetOK) console.log('- Verificar la conexión a internet');
    if (!dnsOK) console.log('- Verificar la resolución DNS');
    if (!mongoDBAtlasOK) console.log('- Verificar la conexión a MongoDB Atlas');
    if (!modelOK) console.log('- Verificar la configuración del modelo PDFDocument');
    if (!apiOK) console.log('- Verificar que el servidor esté funcionando correctamente');
  }
}

// Ejecutar diagnóstico
runDiagnostics()
  .then(() => {
    console.log('\nDiagnóstico finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError durante el diagnóstico:', error);
    process.exit(1);
  });
