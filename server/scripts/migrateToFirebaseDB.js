/**
 * Script para migrar PDFs de MongoDB a Firebase Realtime Database
 *
 * Este script:
 * 1. Busca todos los documentos en MongoDB que tienen el PDF almacenado
 * 2. Sube cada PDF a Firebase Realtime Database
 * 3. Actualiza el documento en MongoDB con el ID de Firebase Realtime Database
 * 4. Opcionalmente, elimina el PDF de MongoDB para ahorrar espacio
 *
 * Uso:
 * node migrateToFirebaseDB.js [--delete-after-migration]
 *
 * Opciones:
 * --delete-after-migration: Elimina el PDF de MongoDB después de migrarlo a Firebase Realtime Database
 */

// Cargar variables de entorno desde el archivo .env
require('dotenv').config();
const mongoose = require('mongoose');
const { connectPDFDatabase } = require('../config/pdfDatabase');
const { uploadPDFToFirebaseDB } = require('../config/firebaseDB');
const { initModel } = require('../models/PDFDocument');

// Argumentos de línea de comandos
const deleteAfterMigration = process.argv.includes('--delete-after-migration');

// Función principal
async function migrateToFirebaseDB() {
  try {
    console.log('Iniciando migración de PDFs a Firebase Realtime Database...');

    // Conectar a MongoDB
    const pdfConnection = await connectPDFDatabase();

    // Obtener el modelo PDFDocument
    const PDFDocument = await initModel();

    // Buscar documentos que tienen PDF almacenado en MongoDB
    // y que no tienen ID de Firebase Realtime Database
    const documents = await PDFDocument.find({
      pdf: { $exists: true, $ne: null },
      $or: [
        { pdfId: { $exists: false } },
        { pdfId: null },
        { pdfId: '' }
      ]
    });

    console.log(`Se encontraron ${documents.length} documentos para migrar.`);

    // Contador de documentos migrados
    let migratedCount = 0;
    let errorCount = 0;

    // Migrar cada documento
    for (const document of documents) {
      try {
        console.log(`Migrando documento ${document._id} (${migratedCount + 1}/${documents.length})...`);

        // Verificar si el documento tiene PDF
        if (!document.pdf || !Buffer.isBuffer(document.pdf)) {
          console.log(`El documento ${document._id} no tiene PDF válido, omitiendo...`);
          continue;
        }

        // Subir PDF a Firebase Realtime Database
        const pdfId = await uploadPDFToFirebaseDB(
          document.pdf,
          document.f || `document_${document._id}.pdf`
        );

        // Actualizar documento en MongoDB
        const updateData = {
          pdfId: pdfId,
          storageType: 'firebase-db',
          fileSize: document.pdf.length
        };

        // Si se especificó la opción de eliminar después de migrar
        if (deleteAfterMigration) {
          updateData.pdf = null; // Eliminar PDF de MongoDB
        }

        await PDFDocument.findByIdAndUpdate(document._id, updateData);

        console.log(`Documento ${document._id} migrado exitosamente a Firebase Realtime Database.`);
        console.log(`ID: ${pdfId}`);

        migratedCount++;
      } catch (error) {
        console.error(`Error al migrar documento ${document._id}:`, error);
        errorCount++;
      }
    }

    console.log('\n===== RESUMEN DE MIGRACIÓN =====');
    console.log(`Total de documentos encontrados: ${documents.length}`);
    console.log(`Documentos migrados exitosamente: ${migratedCount}`);
    console.log(`Documentos con errores: ${errorCount}`);
    console.log(`PDFs eliminados de MongoDB: ${deleteAfterMigration ? migratedCount : 0}`);

    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');

    console.log('\nMigración completada.');

  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
migrateToFirebaseDB().then(() => {
  console.log('Script finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
