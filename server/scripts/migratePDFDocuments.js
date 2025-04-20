/**
 * Script para migrar documentos PDF al esquema optimizado
 * 
 * Este script actualiza los documentos existentes en la base de datos
 * para que utilicen el nuevo esquema optimizado con campos abreviados
 * y almacenamiento más eficiente.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Importar configuración de base de datos
const { connectPDFDatabase } = require('../config/pdfDatabase');

// Función principal de migración
async function migratePDFDocuments() {
  console.log('Iniciando migración de documentos PDF a esquema optimizado...');
  
  try {
    // Conectar a la base de datos
    const pdfConnection = await connectPDFDatabase();
    console.log('Conexión a la base de datos establecida');
    
    // Obtener la colección de documentos PDF
    const pdfCollection = pdfConnection.collection('pdfdocuments');
    
    // Contar documentos antes de la migración
    const totalDocuments = await pdfCollection.countDocuments();
    console.log(`Total de documentos a migrar: ${totalDocuments}`);
    
    if (totalDocuments === 0) {
      console.log('No hay documentos para migrar');
      await pdfConnection.close();
      return;
    }
    
    // Obtener todos los documentos
    const documents = await pdfCollection.find({}).toArray();
    console.log(`Recuperados ${documents.length} documentos para migración`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // Procesar cada documento
    for (const doc of documents) {
      try {
        const updates = {};
        
        // Migrar estado
        if (doc.s === 'pendiente') {
          updates.s = 'p';
        } else if (doc.s === 'procesado') {
          updates.s = 'c';
        } else if (doc.s === 'error') {
          updates.s = 'e';
        }
        
        // Migrar análisis de Gemini
        if (doc.geminiAnalysis) {
          updates.g = doc.geminiAnalysis;
          updates.$unset = { geminiAnalysis: "" };
        }
        
        // Migrar PDF de base64 a Buffer
        if (doc.pdf && typeof doc.pdf === 'string') {
          try {
            updates.pdf = Buffer.from(doc.pdf, 'base64');
          } catch (bufferError) {
            console.error(`Error al convertir PDF a Buffer para documento ${doc._id}:`, bufferError);
          }
        }
        
        // Aplicar actualizaciones si hay cambios
        if (Object.keys(updates).length > 0) {
          const result = await pdfCollection.updateOne(
            { _id: doc._id },
            { $set: updates }
          );
          
          if (result.modifiedCount > 0) {
            migratedCount++;
            console.log(`Documento ${doc._id} migrado correctamente`);
          }
        }
      } catch (docError) {
        errorCount++;
        console.error(`Error al migrar documento ${doc._id}:`, docError);
      }
    }
    
    console.log('\nResumen de la migración:');
    console.log(`- Total de documentos: ${totalDocuments}`);
    console.log(`- Documentos migrados: ${migratedCount}`);
    console.log(`- Errores: ${errorCount}`);
    
    // Cerrar conexión
    await pdfConnection.close();
    console.log('Migración completada');
    
  } catch (error) {
    console.error('Error durante la migración:', error);
  }
}

// Ejecutar la migración
migratePDFDocuments()
  .then(() => {
    console.log('Proceso de migración finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal durante la migración:', error);
    process.exit(1);
  });
