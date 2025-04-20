require('dotenv').config();
const { connectPDFDatabase } = require('../config/pdfDatabase');
const mongoose = require('mongoose');

// Función para verificar la conexión y los documentos
async function verifyPDFStorage() {
  console.log('Verificando almacenamiento de PDFs en MongoDB Atlas...');

  try {
    // Conectar a MongoDB Atlas
    console.log('Conectando a MongoDB Atlas...');
    const connection = await connectPDFDatabase();

    if (!connection) {
      console.error('❌ No se pudo establecer conexión con MongoDB Atlas');
      return false;
    }

    console.log('✅ Conexión establecida con MongoDB Atlas');

    // Verificar colecciones existentes
    console.log('Verificando colecciones existentes...');
    // Acceder a la base de datos
    const db = connection.db;
    if (!db) {
      console.log('Accediendo a la base de datos directamente...');
      // Intentar acceder a la base de datos de otra manera
      const collections = await connection.collections;
      console.log('Colecciones encontradas:', Object.keys(collections).join(', ') || 'Ninguna');
    } else {
      const collections = await db.listCollections().toArray();
      console.log('Colecciones encontradas:', collections.map(c => c.name).join(', ') || 'Ninguna');
    }

    // Verificar documentos en la colección PDFDocument
    console.log('Verificando documentos en la colección PDFDocument...');
    try {
      // Intentar acceder a la colección de diferentes maneras
      let PDFDocumentCollection;
      let count = 0;

      try {
        // Primer intento: usar el método collection
        PDFDocumentCollection = connection.collection('pdfdocuments');
        count = await PDFDocumentCollection.countDocuments();
      } catch (err) {
        console.log('Intentando acceder a la colección de otra manera...');
        // Segundo intento: usar el modelo directamente
        const { initModel } = require('../models/PDFDocument');
        const PDFDocument = await initModel();
        count = await PDFDocument.countDocuments();
        PDFDocumentCollection = PDFDocument.collection;
      }

      console.log(`Documentos encontrados: ${count}`);

      if (count > 0 && PDFDocumentCollection) {
        // Mostrar algunos documentos de ejemplo
        const documents = await PDFDocumentCollection.find({}).limit(5).toArray();
        console.log('Ejemplos de documentos:');
        documents.forEach((doc, index) => {
          console.log(`Documento ${index + 1}:`);
          console.log(`  ID: ${doc._id}`);
          console.log(`  Título: ${doc.t || 'No disponible'}`);
          console.log(`  Estado: ${doc.s || 'No disponible'}`);
          console.log(`  Fecha de creación: ${doc.creado || 'No disponible'}`);
          // No mostrar el PDF completo en base64 para evitar saturar la consola
          console.log(`  Tamaño del PDF: ${doc.pdf ? Math.round(doc.pdf.length / 1024) + ' KB' : 'No disponible'}`);
          console.log(`  Conversaciones: ${doc.conv ? doc.conv.length : 0}`);
        });
      }
    } catch (collectionError) {
      console.error('Error al acceder a la colección PDFDocument:', collectionError);
    }

    // Cerrar conexión
    await connection.close();
    console.log('Conexión cerrada');

    return true;
  } catch (error) {
    console.error('❌ Error al verificar almacenamiento de PDFs:', error);
    return false;
  }
}

// Ejecutar la función principal
verifyPDFStorage()
  .then(result => {
    if (result) {
      console.log('✅ Verificación completada con éxito');
      process.exit(0);
    } else {
      console.error('❌ Verificación fallida');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  });
