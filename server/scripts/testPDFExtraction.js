require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { processPDF, analyzePDF } = require('../services/pdfService');

// Función para probar la extracción de datos de un PDF
async function testPDFExtraction(pdfPath) {
  console.log('=== PRUEBA DE EXTRACCIÓN DE DATOS DE PDF ===');
  console.log(`Archivo: ${pdfPath}`);
  
  // Verificar que el archivo existe
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: El archivo no existe: ${pdfPath}`);
    return;
  }
  
  try {
    console.log('\n1. Procesando PDF básico...');
    const basicResult = await processPDF(pdfPath, {
      extractTables: false,
      extractForms: false,
      extractImages: false
    });
    
    if (basicResult.success) {
      console.log('✅ Procesamiento básico exitoso');
      console.log(`Texto extraído (primeros 200 caracteres): ${basicResult.text.substring(0, 200)}...`);
      console.log(`Páginas: ${basicResult.pages}`);
      console.log(`Tiempo de procesamiento: ${basicResult.processingTime}ms`);
    } else {
      console.error('❌ Error en procesamiento básico:', basicResult.error);
    }
    
    console.log('\n2. Analizando PDF completo...');
    const analysisResult = await analyzePDF(pdfPath);
    
    if (analysisResult.success) {
      console.log('✅ Análisis completo exitoso');
      console.log('Resumen:');
      console.log(`- Páginas: ${analysisResult.summary.pages}`);
      console.log(`- Tablas: ${analysisResult.summary.tables}`);
      console.log(`- Formularios: ${analysisResult.summary.forms}`);
      console.log(`- Longitud del texto: ${analysisResult.summary.textLength} caracteres`);
      
      // Mostrar información de tablas si hay
      if (analysisResult.content.tables && analysisResult.content.tables.length > 0) {
        console.log('\nTablas encontradas:');
        analysisResult.content.tables.forEach((table, index) => {
          console.log(`Tabla ${index + 1}: ${table.rows} filas x ${table.columns} columnas`);
        });
      }
      
      // Mostrar información de metadatos si hay
      if (analysisResult.content.metadata && Object.keys(analysisResult.content.metadata).length > 0) {
        console.log('\nMetadatos:');
        Object.entries(analysisResult.content.metadata).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
    } else {
      console.error('❌ Error en análisis completo:', analysisResult.error);
    }
    
  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

// Ejecutar la prueba con un archivo de ejemplo
const testPDFPath = process.argv[2] || path.join(__dirname, '../uploads/ejemplo.pdf');
testPDFExtraction(testPDFPath)
  .then(() => {
    console.log('\nPrueba finalizada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError en la prueba:', error);
    process.exit(1);
  });
