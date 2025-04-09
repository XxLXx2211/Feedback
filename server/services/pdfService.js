const { LLMWhispererClientV2 } = require('llmwhisperer-client');
const fs = require('fs');
const path = require('path');

// Configurar cliente LLMWhisperer con opciones avanzadas
const llmwhispererClient = new LLMWhispererClientV2({
  apiKey: process.env.LLMWHISPERER_API_KEY,
  baseUrl: process.env.LLMWHISPERER_BASE_URL_V2 || 'https://llmwhisperer-api.us-central.unstract.com/api/v2',
  loggingLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug' // Usar 'info' en producción para reducir logs
});

/**
 * Procesa un archivo PDF y extrae su texto usando LLMWhisperer
 * @param {string} filePath - Ruta al archivo PDF
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
async function processPDF(filePath, options = {}) {
  try {
    console.log(`Procesando archivo PDF: ${filePath}`);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`El archivo no existe: ${filePath}`);
      return { success: false, error: 'Archivo no encontrado' };
    }

    // Configurar opciones de procesamiento optimizadas para mejor detección de casillas
    const processingOptions = {
      filePath: filePath,
      mode: options.mode || 'form', // Usar modo 'form' para mejor extracción de datos estructurados
      waitForCompletion: options.waitForCompletion !== false,
      waitTimeout: options.waitTimeout || 180, // 3 minutos por defecto
      // Opciones adicionales para mejorar la extracción
      lang: 'spa', // Idioma español para mejor reconocimiento de texto en español
      tag: options.tag || 'supervision_efectiva' // Etiqueta personalizada para identificar el tipo de documento
    };

    // Usar LLMWhisperer para procesar el PDF
    console.log('Enviando solicitud a LLMWhisperer con opciones optimizadas');
    // Mostrar opciones de procesamiento de forma resumida
    console.log(`Modo: ${processingOptions.mode}, Idioma: ${processingOptions.lang}, Timeout: ${processingOptions.waitTimeout}s`);

    const result = await llmwhispererClient.whisper(processingOptions);
    console.log(`Respuesta recibida de LLMWhisperer: ${result.status}`);

    if (result.status === 'processed' && result.extraction && result.extraction.result_text) {
      console.log('Procesamiento exitoso. Extrayendo resultados...');

      // Extraer información relevante
      const processedResult = {
        success: true,
        text: result.extraction.result_text || '',
        metadata: result.extraction.metadata || {},
        tables: result.extraction.tables || [],
        forms: result.extraction.forms || [],
        images: result.extraction.images || [],
        pages: result.extraction.pages || 0,
        processingTime: result.processingTime || 0,
        rawText: result.extraction.raw_text || '',
        checkboxes: result.extraction.checkboxes || []
      };

      // Mostrar un resumen del texto extraído en la terminal
      const textLength = processedResult.text.length;
      console.log(`\nTexto extraído: ${textLength} caracteres`);
      // Mostrar solo las primeras 200 caracteres como vista previa
      if (textLength > 0) {
        console.log(`Vista previa: ${processedResult.text.substring(0, 200)}${textLength > 200 ? '...' : ''}`);
      }

      // Procesar el texto para mejorar la detección de casillas marcadas
      processedResult.enhancedText = enhanceTextWithCheckboxInfo(processedResult.text, processedResult.forms, processedResult.checkboxes);

      return processedResult;
    } else if (result.status === 'processing') {
      console.log('El documento está siendo procesado. ID:', result.whisper_hash);
      return {
        success: false,
        status: 'processing',
        id: result.whisper_hash,
        message: 'El documento está siendo procesado. Intente más tarde.'
      };
    } else {
      console.error(`Error en el procesamiento: ${result.message || 'Error desconocido'}`);
      return {
        success: false,
        error: result.message || 'Error desconocido en el procesamiento'
      };
    }
  } catch (error) {
    console.error('Error al procesar PDF con LLMWhisperer:', error);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
}

/**
 * Procesa el texto extraído para eliminar los prefijos [0] y detectar elementos de inspección
 * @param {string} text - Texto extraído del PDF
 * @returns {string} - Texto procesado sin prefijos [0]
 */
function processExtractedText(text) {
  if (!text) return '';

  // Dividir el texto en líneas
  const lines = text.split('\n');

  // Eliminar los prefijos [0] y espacios en blanco al inicio
  const cleanedLines = lines.map(line => {
    // Eliminar prefijos como [0] al inicio de la línea
    return line.replace(/^\s*\[\d+\]\s*/, '');
  });

  return cleanedLines.join('\n');
}

/**
 * Identifica elementos de inspección y sus estados en el texto
 * @param {string} text - Texto procesado
 * @returns {Array} - Array de objetos con información de elementos y estados
 */
function identifyInspectionElements(text) {
  if (!text) return [];

  // Lista de elementos comunes en formularios de inspección
  const commonElements = [
    'Techos', 'Sobretechos', 'Bajo Silos', 'Sobre Silos', 'Azoteas', 'Tuberías',
    'Rocas', 'Vidrios', 'Escalera', 'Rejillas', 'Mallas', 'Elevadores', 'Paredes',
    'Rack', 'Puntos Muertos', 'Pisos', 'Santamaría', 'Extintores', 'Lámparas',
    'Puertas', 'Cortinas', 'Portones', 'Plataformas', 'Defensas', 'Vigas',
    'Baños', 'Nevera', 'Micro Ondas', 'Comedor', 'Canaletas', 'Canales',
    'Camineria', 'Avisos', 'Silos', 'Umbrales de Ventanas'
  ];

  // Dividir el texto en líneas
  const lines = text.split('\n');

  // Elementos identificados
  const elements = [];

  // Buscar elementos en el texto
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Verificar si la línea contiene alguno de los elementos comunes
    for (const element of commonElements) {
      if (line.includes(element)) {
        // Buscar información de estado en la misma línea o en líneas cercanas
        let state = 'No determinado';
        let observation = '';

        // Buscar patrones de estado (E, B, R, D) en la línea actual y siguientes
        const statePattern = /\b[EBRD]\b/;
        const observationPattern = /Observaci[oó]n[:\s]+(.*)/i;

        // Buscar patrones de casillas marcadas con [X]
        const checkboxPattern = /\[\s*([X\*\/\\\+\-\|])\s*\]/i;

        // Verificar la línea actual para casillas marcadas
        if (checkboxPattern.test(line)) {
          // Buscar qué casilla está marcada (E, B, R, D)
          const parts = line.split(/\[\s*\]|\[\s*X\s*\]/).filter(p => p.trim());

          // Determinar la posición de la marca [X]
          const positions = [];
          let pos = 0;
          let match;
          const regex = /\[\s*([X\*\/\\\+\-\|])\s*\]/gi;

          while ((match = regex.exec(line)) !== null) {
            positions.push(pos);
            pos++;
          }

          // Asignar estado basado en la posición de la marca
          if (positions.length > 0) {
            const position = positions[0]; // Usar la primera marca encontrada
            state = position === 0 ? 'Excelente' :
                   position === 1 ? 'Bueno' :
                   position === 2 ? 'Regular' :
                   position === 3 ? 'Deficiente' : 'No determinado';
          }
        }

        // Verificar la línea actual para patrones de estado explícitos
        if (state === 'No determinado' && statePattern.test(line)) {
          const match = line.match(statePattern);
          if (match) {
            const stateCode = match[0];
            state = stateCode === 'E' ? 'Excelente' :
                   stateCode === 'B' ? 'Bueno' :
                   stateCode === 'R' ? 'Regular' :
                   stateCode === 'D' ? 'Deficiente' : 'No determinado';
          }
        }

        // Buscar observaciones
        if (observationPattern.test(line)) {
          const match = line.match(observationPattern);
          if (match && match[1]) {
            observation = match[1].trim();
          }
        }

        // Buscar en las siguientes líneas (hasta 3 líneas)
        for (let j = 1; j <= 3; j++) {
          if (i + j < lines.length) {
            const nextLine = lines[i + j].trim();

            // Buscar estado
            if (state === 'No determinado' && statePattern.test(nextLine)) {
              const match = nextLine.match(statePattern);
              if (match) {
                const stateCode = match[0];
                state = stateCode === 'E' ? 'Excelente' :
                       stateCode === 'B' ? 'Bueno' :
                       stateCode === 'R' ? 'Regular' :
                       stateCode === 'D' ? 'Deficiente' : 'No determinado';
              }
            }

            // Buscar observaciones
            if (!observation && observationPattern.test(nextLine)) {
              const match = nextLine.match(observationPattern);
              if (match && match[1]) {
                observation = match[1].trim();
              }
            }

            // Si encontramos texto adicional que podría ser una observación
            if (!observation && nextLine && !commonElements.some(el => nextLine.includes(el))) {
              observation = nextLine;
            }
          }
        }

        // Agregar el elemento a la lista
        elements.push({
          element,
          state,
          observation
        });

        break; // Pasar al siguiente elemento
      }
    }
  }

  return elements;
}

/**
 * Mejora el texto con información de casillas marcadas
 * @param {string} text - Texto extraído del PDF
 * @param {Array} forms - Información de formularios
 * @param {Array} checkboxes - Información de casillas
 * @returns {string} - Texto mejorado
 */
function enhanceTextWithCheckboxInfo(text, forms, checkboxes) {
  // Procesar el texto para eliminar prefijos [0]
  const processedText = processExtractedText(text);

  // Identificar elementos de inspección
  const elements = identifyInspectionElements(processedText);

  // Texto mejorado
  let enhancedText = processedText;

  // No añadimos información adicional

  // Procesar información de formularios si está disponible
  if (forms && forms.length > 0) {
    forms.forEach((form, index) => {
      enhancedText += `\nFormulario ${index + 1}:\n`;

      if (form.fields) {
        form.fields.forEach(field => {
          if (field.type === 'checkbox' || field.type === 'radio') {
            enhancedText += `- Campo "${field.name || 'Sin nombre'}": ${field.value ? 'MARCADO' : 'NO MARCADO'}\n`;
          }
        });
      }
    });
  }

  // Procesar información de casillas si está disponible
  if (checkboxes && checkboxes.length > 0) {
    enhancedText += '\nCasillas detectadas:\n';

    checkboxes.forEach((checkbox, index) => {
      const status = checkbox.checked ? 'MARCADA' : 'NO MARCADA';
      const label = checkbox.label || `Casilla ${index + 1}`;
      enhancedText += `- ${label}: ${status}\n`;
    });
  }

  // No añadimos la sección de elementos de inspección al texto mejorado
  // Solo mantenemos el texto original procesado

  // Imprimir en la consola para depuración
  console.log('\n===== ELEMENTOS IDENTIFICADOS =====');
  console.log(JSON.stringify(elements, null, 2));
  console.log('\n===== FIN DE ELEMENTOS IDENTIFICADOS =====');

  // Eliminar la sección "ELEMENTOS DE INSPECCIÓN" del texto mejorado
  enhancedText = enhancedText.replace(/\n--- ELEMENTOS DE INSPECCIÓN ---[\s\S]*/, '');

  // Eliminar cualquier línea que contenga "ELEMENTOS DE INSPECCIÓN"
  enhancedText = enhancedText.split('\n').filter(line => !line.includes('ELEMENTOS DE INSPECCIÓN')).join('\n');

  // Eliminar cualquier línea que contenga "CASILLA"
  enhancedText = enhancedText.split('\n').filter(line => !line.includes('CASILLA')).join('\n');

  // Eliminar cualquier línea que contenga "Observación:"
  enhancedText = enhancedText.split('\n').filter(line => !line.includes('Observación:')).join('\n');

  return enhancedText;
}

/**
 * Extrae solo el texto de un PDF (función de compatibilidad)
 * @param {string} filePath - Ruta al archivo PDF
 * @returns {Promise<string|null>} - Texto extraído o null si hay error
 */
async function extractTextFromPDF(filePath) {
  try {
    const result = await processPDF(filePath, {
      extractTables: false,
      extractForms: false,
      extractImages: false
    });

    if (result.success && result.text) {
      return result.text;
    } else {
      console.error('Error al extraer texto:', result.error || 'Resultado vacío');
      return null;
    }
  } catch (error) {
    console.error('Error en extractTextFromPDF:', error);
    return null;
  }
}

/**
 * Analiza un PDF para extraer información estructurada
 * @param {string} filePath - Ruta al archivo PDF
 * @returns {Promise<Object>} - Información estructurada extraída
 */
async function analyzePDF(filePath) {
  try {
    console.log(`Analizando PDF: ${filePath}`);

    // Procesar el PDF con todas las opciones habilitadas
    const result = await processPDF(filePath, {
      extractTables: true,
      extractForms: true,
      extractImages: false, // Las imágenes pueden ser muy pesadas
      waitTimeout: 600 // 10 minutos para análisis completo
    });

    if (!result.success) {
      console.error('Error en processPDF:', result.error || 'Error desconocido');
      return result; // Devolver el error
    }

    console.log('Procesamiento exitoso, estructurando información...');

    // Procesar el texto para eliminar los prefijos [0]
    const processedText = processExtractedText(result.text || '');

    // Identificar elementos de inspección en el texto procesado
    const elements = identifyInspectionElements(processedText);

    // Generar texto mejorado
    let enhancedText = processedText;

    // No mostramos información de elementos

    // Imprimir en la consola para depuración
    console.log('\n===== ELEMENTOS IDENTIFICADOS PARA ANÁLISIS =====');
    console.log(JSON.stringify(elements, null, 2));
    console.log('\n===== FIN DE ELEMENTOS IDENTIFICADOS PARA ANÁLISIS =====');

    // Mostrar el texto mejorado completo
    console.log('\n===== TEXTO MEJORADO COMPLETO =====');
    console.log(enhancedText);
    console.log('\n===== FIN DEL TEXTO MEJORADO COMPLETO =====');

    // Estructurar la información extraída
    const analysis = {
      success: true,
      summary: {
        pages: result.pages || 0,
        tables: (result.tables && result.tables.length) || 0,
        forms: (result.forms && result.forms.length) || 0,
        textLength: processedText.length || 0,
        processingTime: result.processingTime || 0,
        elementsIdentified: elements.length
      },
      content: {
        text: processedText || '',
        enhancedText: enhancedText || result.enhancedText || '',
        tables: result.tables || [],
        forms: result.forms || [],
        metadata: result.metadata || {},
        elements: elements
      }
    };

    console.log('Análisis completado con éxito');
    return analysis;
  } catch (error) {
    console.error('Error al analizar PDF:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido en el análisis'
    };
  }
}

module.exports = {
  extractTextFromPDF,
  processPDF,
  analyzePDF
};
