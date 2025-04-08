/**
 * Script para probar la funcionalidad de procesamiento de PDF con LLMWhisperer
 *
 * Este script permite probar el procesamiento de un PDF utilizando el cliente LLMWhisperer
 * sin necesidad de subir el archivo a través de la API.
 *
 * Uso: node testLLMWhisperer.js <ruta-al-pdf>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { LLMWhispererClientV2 } = require('llmwhisperer-client');

// Verificar argumentos
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Error: Debe proporcionar la ruta a un archivo PDF');
  console.log('Uso: node testLLMWhisperer.js <ruta-al-pdf>');
  process.exit(1);
}

// Verificar que el archivo existe
if (!fs.existsSync(pdfPath)) {
  console.error(`Error: El archivo no existe: ${pdfPath}`);
  process.exit(1);
}

// Configurar cliente LLMWhisperer
const llmwhispererClient = new LLMWhispererClientV2({
  apiKey: process.env.LLMWHISPERER_API_KEY,
  baseUrl: process.env.LLMWHISPERER_BASE_URL_V2 || 'https://llmwhisperer-api.us-central.unstract.com/api/v2',
  loggingLevel: 'debug'
});

// Función para procesar el PDF
async function processPDF(filePath) {
  console.log(`Procesando archivo PDF: ${filePath}`);

  try {
    // Configurar opciones de procesamiento
    const processingOptions = {
      filePath: filePath,
      mode: 'form', // Usar modo 'form' para mejor extracción de datos estructurados
      waitForCompletion: true,
      waitTimeout: 180,
      lang: 'spa',
      tag: 'supervision_efectiva'
    };

    console.log('Enviando solicitud a LLMWhisperer...');
    console.log('Opciones de procesamiento:', JSON.stringify(processingOptions, null, 2));

    const result = await llmwhispererClient.whisper(processingOptions);

    console.log('Respuesta recibida de LLMWhisperer:', JSON.stringify(result, null, 2));

    if (result.status === 'processed') {
      console.log('Procesamiento exitoso. Extrayendo resultados...');

      // Mostrar información básica
      console.log('\nInformación del documento:');
      console.log(`- Páginas: ${result.extraction.pages || 0}`);
      console.log(`- Tiempo de procesamiento: ${result.processingTime || 0}ms`);

      // Mostrar extracto del texto
      const textPreview = result.extraction.result_text ?
        result.extraction.result_text.substring(0, 500) + '...' :
        'No se extrajo texto';

      console.log('\nExtracto del texto:');
      console.log(textPreview);

      // Guardar resultado completo en un archivo JSON
      const outputPath = path.join(__dirname, 'llmwhisperer_result.json');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nResultado completo guardado en: ${outputPath}`);

      return true;
    } else {
      console.error(`Error en el procesamiento: ${result.message || 'Error desconocido'}`);
      return false;
    }
  } catch (error) {
    console.error('Error al procesar PDF con LLMWhisperer:', error);
    return false;
  }
}

// Ejecutar el procesamiento
processPDF(pdfPath)
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
