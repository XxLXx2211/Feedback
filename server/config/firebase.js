/**
 * Configuración de Firebase para almacenamiento de PDFs
 * Este módulo proporciona funciones para interactuar con Firebase Storage
 */

const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// Variable para almacenar la instancia de Firebase
let firebaseApp = null;
let firebaseStorage = null;

/**
 * Inicializa Firebase Admin SDK
 * @returns {Object} Instancia de Firebase
 */
const initializeFirebase = () => {
  try {
    // Si ya está inicializado, devolver la instancia existente
    if (firebaseApp) {
      return { app: firebaseApp, storage: firebaseStorage };
    }

    // Verificar si existe la variable de entorno con las credenciales
    if (process.env.FIREBASE_CREDENTIALS) {
      // Usar credenciales desde variable de entorno (recomendado para producción)
      const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } else {
      // Buscar archivo de credenciales (para desarrollo)
      const credentialsPath = path.join(__dirname, '../firebase-credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('No se encontró el archivo de credenciales de Firebase. Por favor, crea el archivo firebase-credentials.json en la carpeta server o configura la variable de entorno FIREBASE_CREDENTIALS.');
      }
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(require(credentialsPath)),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'tu-proyecto.appspot.com'
      });
    }

    // Inicializar Storage
    firebaseStorage = getStorage(firebaseApp);
    
    console.log('Firebase inicializado correctamente');
    return { app: firebaseApp, storage: firebaseStorage };
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    throw error;
  }
};

/**
 * Sube un archivo PDF a Firebase Storage
 * @param {Buffer} fileBuffer - Buffer del archivo PDF
 * @param {String} fileName - Nombre del archivo
 * @returns {Promise<String>} URL del archivo subido
 */
const uploadPDFToFirebase = async (fileBuffer, fileName) => {
  try {
    // Inicializar Firebase si no está inicializado
    const { storage } = initializeFirebase();
    
    // Obtener referencia al bucket
    const bucket = storage.bucket();
    
    // Crear un nombre de archivo único
    const uniqueFileName = `pdfs/${Date.now()}-${fileName}`;
    
    // Crear archivo en Firebase Storage
    const file = bucket.file(uniqueFileName);
    
    // Subir el buffer al archivo
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf'
      }
    });
    
    // Hacer el archivo públicamente accesible
    await file.makePublic();
    
    // Obtener URL pública
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
    
    console.log(`PDF subido exitosamente a Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error al subir PDF a Firebase Storage:', error);
    throw error;
  }
};

/**
 * Elimina un archivo PDF de Firebase Storage
 * @param {String} fileUrl - URL del archivo a eliminar
 * @returns {Promise<Boolean>} True si se eliminó correctamente
 */
const deletePDFFromFirebase = async (fileUrl) => {
  try {
    // Inicializar Firebase si no está inicializado
    const { storage } = initializeFirebase();
    
    // Obtener referencia al bucket
    const bucket = storage.bucket();
    
    // Extraer el nombre del archivo de la URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts.slice(4).join('/'); // Omitir 'https://storage.googleapis.com/bucket-name/'
    
    // Eliminar el archivo
    await bucket.file(fileName).delete();
    
    console.log(`PDF eliminado exitosamente de Firebase Storage: ${fileName}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar PDF de Firebase Storage:', error);
    return false;
  }
};

module.exports = {
  initializeFirebase,
  uploadPDFToFirebase,
  deletePDFFromFirebase
};
