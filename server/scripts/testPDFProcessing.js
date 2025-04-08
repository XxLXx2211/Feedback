/**
 * Script para probar el procesamiento de PDF con la nueva implementación
 *
 * Este script permite probar el procesamiento de un PDF utilizando las nuevas funciones
 * sin necesidad de subir el archivo a través de la API.
 *
 * Uso: node testPDFProcessing.js <ruta-al-pdf>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { analyzePDF, processPDF } = require('../services/pdfService');

// Verificar argumentos
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Error: Debe proporcionar la ruta a un archivo PDF');
  console.log('Uso: node testPDFProcessing.js <ruta-al-pdf>');
  process.exit(1);
}

// Verificar que el archivo existe
if (!fs.existsSync(pdfPath)) {
  console.error(`Error: El archivo no existe: ${pdfPath}`);
  process.exit(1);
}

// Función para procesar el PDF
async function testProcessPDF(filePath) {
  console.log(`Procesando archivo PDF: ${filePath}`);

  try {
    // Procesar el PDF
    console.log('Procesando PDF con processPDF...');
    const processResult = await processPDF(filePath, {
      waitForCompletion: true,
      waitTimeout: 300
    });

    if (!processResult.success) {
      console.error('Error al procesar PDF:', processResult.error);
      return false;
    }

    // Mostrar información básica del procesamiento
    console.log('\nInformación del procesamiento:');
    console.log(`- Éxito: ${processResult.success}`);
    console.log(`- Longitud del texto: ${processResult.text ? processResult.text.length : 0} caracteres`);

    // Mostrar el texto procesado completo
    if (processResult.text) {
      console.log('\nTexto procesado completo:');
      console.log(processResult.text);
    }

    // Analizar el PDF
    console.log('\nAnalizando PDF con analyzePDF...');
    const analysisResult = await analyzePDF(filePath);

    if (!analysisResult.success) {
      console.error('Error al analizar PDF:', analysisResult.error);
      return false;
    }

    // Mostrar información del análisis
    console.log('\nInformación del análisis:');
    console.log(`- Éxito: ${analysisResult.success}`);
    console.log(`- Páginas: ${analysisResult.summary.pages}`);
    console.log(`- Elementos identificados: ${analysisResult.summary.elementsIdentified}`);

    // Mostrar elementos identificados
    if (analysisResult.content.elements && analysisResult.content.elements.length > 0) {
      console.log('\nElementos identificados:');
      analysisResult.content.elements.forEach((element, index) => {
        console.log(`${index + 1}. ${element.element}: ${element.state}${element.observation ? ` - ${element.observation}` : ''}`);
      });
    } else {
      console.log('\nNo se identificaron elementos en el documento.');
    }

    // Mostrar el texto mejorado completo
    if (analysisResult.content.enhancedText) {
      console.log('\nTexto mejorado completo:');
      console.log(analysisResult.content.enhancedText);
    }

    return true;
  } catch (error) {
    console.error('Error durante la prueba:', error);
    return false;
  }
}

// Ejecutar la prueba
testProcessPDF(pdfPath)
  .then(success => {
    if (success) {
      console.log('\nPrueba completada con éxito');
    } else {
      console.error('\nLa prueba falló');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error durante la prueba:', error);
    process.exit(1);
  });
