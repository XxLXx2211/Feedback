/**
 * Script para probar la conexión a Firebase Realtime Database
 * 
 * Este script:
 * 1. Inicializa Firebase Admin SDK
 * 2. Intenta escribir un dato de prueba en Firebase Realtime Database
 * 3. Lee el dato de prueba
 * 4. Elimina el dato de prueba
 */

// Cargar variables de entorno
require('dotenv').config();
const { initializeFirebase, uploadPDFToFirebaseDB, getPDFFromFirebaseDB, deletePDFFromFirebaseDB } = require('../config/firebaseDB');

// Función principal
async function testFirebaseDB() {
  try {
    console.log('Iniciando prueba de Firebase Realtime Database...');
    
    // Inicializar Firebase
    const { db } = initializeFirebase();
    console.log('Firebase inicializado correctamente');
    
    // Crear un ID único para la prueba
    const testId = `test_${Date.now()}`;
    
    // Escribir un dato de prueba
    console.log(`Escribiendo dato de prueba con ID: ${testId}`);
    const testRef = db.ref(`tests/${testId}`);
    await testRef.set({
      message: 'Esto es una prueba',
      timestamp: Date.now()
    });
    console.log('Dato de prueba escrito correctamente');
    
    // Leer el dato de prueba
    console.log('Leyendo dato de prueba...');
    const snapshot = await testRef.once('value');
    const testData = snapshot.val();
    console.log('Dato leído:', testData);
    
    // Eliminar el dato de prueba
    console.log('Eliminando dato de prueba...');
    await testRef.remove();
    console.log('Dato de prueba eliminado correctamente');
    
    // Probar subida de un pequeño PDF de prueba
    console.log('Probando subida de PDF...');
    const testBuffer = Buffer.from('Este es un PDF de prueba', 'utf-8');
    const pdfId = await uploadPDFToFirebaseDB(testBuffer, 'test.pdf');
    console.log(`PDF de prueba subido con ID: ${pdfId}`);
    
    // Probar descarga del PDF
    console.log('Probando descarga de PDF...');
    const downloadedBuffer = await getPDFFromFirebaseDB(pdfId);
    console.log('PDF descargado correctamente');
    console.log('Contenido:', downloadedBuffer.toString('utf-8'));
    
    // Eliminar el PDF de prueba
    console.log('Eliminando PDF de prueba...');
    await deletePDFFromFirebaseDB(pdfId);
    console.log('PDF de prueba eliminado correctamente');
    
    console.log('\n===== RESUMEN DE PRUEBA =====');
    console.log('Todas las operaciones completadas exitosamente');
    console.log('Firebase Realtime Database está configurado correctamente');
    
  } catch (error) {
    console.error('Error en la prueba de Firebase Realtime Database:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
testFirebaseDB().then(() => {
  console.log('Script finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
