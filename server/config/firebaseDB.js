/**
 * Configuración de Firebase Realtime Database para almacenamiento de PDFs
 * Este módulo proporciona funciones para interactuar con Firebase Realtime Database
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Variable para almacenar la instancia de Firebase
let firebaseApp = null;
let firebaseDB = null;

/**
 * Inicializa Firebase Admin SDK
 * @returns {Object} Instancia de Firebase
 */
const initializeFirebase = () => {
  try {
    // Si ya está inicializado, devolver la instancia existente
    if (firebaseApp) {
      return { app: firebaseApp, db: firebaseDB };
    }

    // Verificar si existe la variable de entorno con las credenciales
    if (process.env.FIREBASE_CREDENTIALS) {
      // Usar credenciales desde variable de entorno (recomendado para producción)
      const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      // Buscar archivo de credenciales (para desarrollo)
      const credentialsPath = path.join(__dirname, '../firebase-credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('No se encontró el archivo de credenciales de Firebase. Por favor, crea el archivo firebase-credentials.json en la carpeta server o configura la variable de entorno FIREBASE_CREDENTIALS.');
      }
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(require(credentialsPath)),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://tu-proyecto-id.firebaseio.com'
      });
    }

    // Inicializar Database
    firebaseDB = firebaseApp.database();
    
    console.log('Firebase Realtime Database inicializado correctamente');
    return { app: firebaseApp, db: firebaseDB };
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    throw error;
  }
};

/**
 * Sube un archivo PDF a Firebase Realtime Database
 * @param {Buffer} fileBuffer - Buffer del archivo PDF
 * @param {String} fileName - Nombre del archivo
 * @returns {Promise<String>} ID de referencia del archivo subido
 */
const uploadPDFToFirebaseDB = async (fileBuffer, fileName) => {
  try {
    // Inicializar Firebase si no está inicializado
    const { db } = initializeFirebase();
    
    // Crear un ID único para el archivo
    const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Convertir el buffer a base64 (necesario para Realtime Database)
    const base64Data = fileBuffer.toString('base64');
    
    // Crear referencia en la base de datos
    const pdfRef = db.ref(`pdfs/${pdfId}`);
    
    // Guardar metadatos y contenido en chunks para evitar límites de tamaño
    // Realtime Database tiene un límite de 10MB por nodo, así que dividimos el PDF
    const chunkSize = 800000; // Aproximadamente 800KB por chunk en base64
    const chunks = [];
    
    for (let i = 0; i < base64Data.length; i += chunkSize) {
      chunks.push(base64Data.substring(i, i + chunkSize));
    }
    
    // Guardar metadatos
    await pdfRef.set({
      fileName: fileName,
      uploadDate: admin.database.ServerValue.TIMESTAMP,
      size: fileBuffer.length,
      chunks: chunks.length
    });
    
    // Guardar chunks
    for (let i = 0; i < chunks.length; i++) {
      await pdfRef.child(`chunk_${i}`).set(chunks[i]);
    }
    
    console.log(`PDF subido exitosamente a Firebase Realtime Database con ID: ${pdfId}`);
    return pdfId;
  } catch (error) {
    console.error('Error al subir PDF a Firebase Realtime Database:', error);
    throw error;
  }
};

/**
 * Obtiene un archivo PDF de Firebase Realtime Database
 * @param {String} pdfId - ID de referencia del archivo
 * @returns {Promise<Buffer>} Buffer del archivo PDF
 */
const getPDFFromFirebaseDB = async (pdfId) => {
  try {
    // Inicializar Firebase si no está inicializado
    const { db } = initializeFirebase();
    
    // Obtener referencia en la base de datos
    const pdfRef = db.ref(`pdfs/${pdfId}`);
    
    // Obtener metadatos
    const snapshot = await pdfRef.once('value');
    const pdfData = snapshot.val();
    
    if (!pdfData) {
      throw new Error(`PDF con ID ${pdfId} no encontrado`);
    }
    
    // Obtener número de chunks
    const numChunks = pdfData.chunks;
    
    // Reconstruir el PDF a partir de los chunks
    let base64Data = '';
    
    for (let i = 0; i < numChunks; i++) {
      const chunkSnapshot = await pdfRef.child(`chunk_${i}`).once('value');
      base64Data += chunkSnapshot.val();
    }
    
    // Convertir de base64 a buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    return buffer;
  } catch (error) {
    console.error('Error al obtener PDF de Firebase Realtime Database:', error);
    throw error;
  }
};

/**
 * Elimina un archivo PDF de Firebase Realtime Database
 * @param {String} pdfId - ID de referencia del archivo a eliminar
 * @returns {Promise<Boolean>} True si se eliminó correctamente
 */
const deletePDFFromFirebaseDB = async (pdfId) => {
  try {
    // Inicializar Firebase si no está inicializado
    const { db } = initializeFirebase();
    
    // Obtener referencia en la base de datos
    const pdfRef = db.ref(`pdfs/${pdfId}`);
    
    // Verificar que el PDF existe
    const snapshot = await pdfRef.once('value');
    if (!snapshot.exists()) {
      console.log(`PDF con ID ${pdfId} no encontrado, nada que eliminar`);
      return false;
    }
    
    // Eliminar el PDF
    await pdfRef.remove();
    
    console.log(`PDF eliminado exitosamente de Firebase Realtime Database: ${pdfId}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar PDF de Firebase Realtime Database:', error);
    return false;
  }
};

module.exports = {
  initializeFirebase,
  uploadPDFToFirebaseDB,
  getPDFFromFirebaseDB,
  deletePDFFromFirebaseDB
};
