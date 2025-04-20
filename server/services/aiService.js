const { GoogleGenerativeAI } = require('@google/generative-ai');
const cleaningStatusService = require('./cleaningStatusService');
const cacheService = require('./cacheService');

// Configurar cliente de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analiza texto usando el servicio de detección de estado de limpieza y Gemini API
 * @param {string} text - Texto a analizar
 * @returns {Promise<string|null>} - Resultado del análisis o null si hay error
 */
async function analyzeWithGemini(text) {
  if (!text) return null;

  try {
    console.log('Iniciando análisis mejorado de estado de limpieza...');

    // Usar caché si está disponible
    const cacheKey = `gemini_analysis_${Buffer.from(text.substring(0, 100)).toString('base64')}`;
    const cachedResult = cacheService.get(cacheKey);

    if (cachedResult) {
      console.log('Usando resultado en caché para análisis de Gemini');
      return cachedResult;
    }

    // Paso 1: Analizar el texto con nuestro servicio especializado
    console.log('Analizando texto con servicio de detección de estado de limpieza...');
    const cleaningElements = cleaningStatusService.analyzeCleaningStatus(text);

    // Paso 2: Si encontramos elementos, generar texto formateado para Gemini
    if (cleaningElements && cleaningElements.length > 0) {
      console.log(`Se encontraron ${cleaningElements.length} elementos de limpieza`);

      // Generar texto formateado para Gemini
      const formattedText = cleaningStatusService.generateGeminiAnalysisText(cleaningElements);

      // Generar resumen
      const summary = cleaningStatusService.generateCleaningSummary(cleaningElements);
      console.log('Resumen de estado de limpieza:', JSON.stringify(summary));

      // Guardar en caché
      cacheService.set(cacheKey, formattedText, 3600); // 1 hora

      return formattedText;
    }

    // Paso 3: Si no encontramos elementos o son muy pocos, usar Gemini como respaldo
    console.log('No se encontraron suficientes elementos, usando Gemini como respaldo...');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Crear un prompt mejorado para Gemini
    const prompt = `Analiza el siguiente texto que proviene de un formulario de inspección de limpieza.

  Analiza el texto para identificar el estado de los elementos inspeccionados.

  Las casillas representan las siguientes opciones en orden:
  Primera casilla: E (Excelente)
  Segunda casilla: B (Bueno)
  Tercera casilla: R (Regular)
  Cuarta casilla: D (Deficiente)

  Busca patrones como:
  - Casillas con una X dentro: [X]
  - Casillas con un check o marca: [✓]
  - Casillas sombreadas o rellenadas
  - Cualquier símbolo o marca que indique selección
  - Texto como "MARCADO", "MARCADA", etc.
  - Cualquier información sobre el estado de los elementos

  IMPORTANTE: Formatea la respuesta EXACTAMENTE de la siguiente manera:

  Resultado análisis:
  El estado del "Techos" es [estado]
  El estado del "Sobretechos" es [estado]
  El estado del "Bajo Silos" es [estado]
  El estado del "Sobre Silos" es [estado]
  El estado del "Azoteas" es [estado]
  El estado del "Tuberías" es [estado]
  El estado del "Rocas" es [estado]
  El estado del "Vidrios" es [estado]
  El estado del "Escalera" es [estado]
  El estado del "Rejillas" es [estado]
  El estado del "Mallas" es [estado]
  El estado del "Elevadores" es [estado]
  El estado del "Paredes" es [estado]
  El estado del "Rack" es [estado]
  El estado del "Puntos Muertos" es [estado]
  El estado del "Pisos" es [estado]
  El estado del "Santamaría" es [estado]
  El estado del "Extintores" es [estado]
  El estado del "Lámparas" es [estado]
  El estado del "Puertas" es [estado]
  El estado del "Cortinas" es [estado]
  El estado del "Portones" es [estado]
  El estado del "Plataformas" es [estado]
  El estado del "Defensas" es [estado]
  El estado del "Vigas" es [estado]
  El estado del "Baños" es [estado]
  El estado del "Nevera" es [estado]
  El estado del "Micro Ondas" es [estado]
  El estado del "Comedor" es [estado]
  El estado del "Canaletas" es [estado]
  El estado del "Canales" es [estado]
  El estado del "Camineria" es [estado]
  El estado del "Avisos" es [estado]
  El estado del "Silos" es [estado]
  El estado del "Umbrales de Ventanas" es [estado]

  Observaciones:
  • [Observación 1 si existe]
  • [Observación 2 si existe]
  • [Observación 3 si existe]

  IMPORTANTE:
  - Usa cualquier información disponible sobre el estado de los elementos.
  - Si una casilla no está marcada, escribe "No Marcada".
  - Si no puedes determinar si una casilla está marcada, escribe "No Determinado".
  - Si hay texto adicional junto a un ítem, inclúyelo como una observación específica para ese ítem.
  - Incluye todos los elementos que puedas identificar en el documento.
  - Asegúrate de incluir TODOS los elementos listados, incluso si no encuentras información sobre ellos.

  Texto a analizar:
  ${text}`;

    console.log('Enviando prompt a Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(`Análisis con Gemini completado: ${responseText.length} caracteres`);

    // Guardar en caché
    cacheService.set(cacheKey, responseText, 3600); // 1 hora

    return responseText;
  } catch (error) {
    console.error('Error en el análisis de estado de limpieza:', error);

    // Intentar usar solo Gemini como último recurso
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Analiza el siguiente texto que proviene de un formulario de inspección y extrae cualquier información sobre el estado de limpieza de los elementos. Formatea la respuesta como una lista de elementos y su estado.

      Texto a analizar:
      ${text}`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (geminiError) {
      console.error('Error al analizar con Gemini:', geminiError);
      return null;
    }
  }
}

/**
 * Genera respuesta para el chat basada en el texto del documento
 * @param {string} userMessage - Mensaje del usuario
 * @param {string} documentText - Texto del documento
 * @param {string} analysisResult - Resultado del análisis previo
 * @returns {Promise<string>} - Respuesta generada
 */
async function generateChatResponse(userMessage, documentText, analysisResult) {
  try {
    console.log('Generando respuesta de chat mejorada...');

    // Usar caché si está disponible
    const cacheKey = `chat_response_${Buffer.from(userMessage).toString('base64')}_${Buffer.from(documentText.substring(0, 50)).toString('base64')}`;
    const cachedResult = cacheService.get(cacheKey);

    if (cachedResult) {
      console.log('Usando respuesta en caché para chat');
      return cachedResult;
    }

    // Paso 1: Analizar el texto con nuestro servicio especializado para tener más contexto
    const cleaningElements = cleaningStatusService.analyzeCleaningStatus(documentText);

    // Paso 2: Generar un resumen del estado de limpieza
    const cleaningSummary = cleaningStatusService.generateCleaningSummary(cleaningElements);

    // Paso 3: Preparar información adicional basada en la pregunta del usuario
    let additionalInfo = '';

    // Verificar si la pregunta es sobre un elemento específico
    const userMessageLower = userMessage.toLowerCase();

    for (const element of cleaningStatusService.CLEANING_ELEMENTS) {
      if (userMessageLower.includes(element.toLowerCase())) {
        // Buscar información sobre este elemento
        const elementInfo = cleaningElements.find(e => e.element.toLowerCase() === element.toLowerCase());

        if (elementInfo) {
          additionalInfo = `\nInformación adicional sobre "${element}":\n` +
            `Estado: ${elementInfo.state}\n` +
            `Confianza: ${Math.round(elementInfo.confidence * 100)}%\n` +
            (elementInfo.observation ? `Observación: ${elementInfo.observation}\n` : '');
        }

        break;
      }
    }

    // Paso 4: Usar Gemini para generar la respuesta final
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Crear un prompt mejorado con toda la información disponible
    const prompt = `Eres un asistente especializado en analizar documentos de inspección de limpieza. Has analizado un documento con el siguiente contenido:

    ${documentText}

    Y has generado el siguiente análisis:

    ${analysisResult}

    Además, tenemos la siguiente información sobre el estado general de limpieza:
    Estado general: ${cleaningSummary.overallStatus}
    Elementos analizados: ${cleaningSummary.elementsCount}
    Elementos en estado Excelente: ${cleaningSummary.statusCounts.Excelente} (${cleaningSummary.statusPercentages.Excelente}%)
    Elementos en estado Bueno: ${cleaningSummary.statusCounts.Bueno} (${cleaningSummary.statusPercentages.Bueno}%)
    Elementos en estado Regular: ${cleaningSummary.statusCounts.Regular} (${cleaningSummary.statusPercentages.Regular}%)
    Elementos en estado Deficiente: ${cleaningSummary.statusCounts.Deficiente} (${cleaningSummary.statusPercentages.Deficiente}%)
    ${additionalInfo}

    El usuario te pregunta: "${userMessage}"

    Responde de manera concisa y profesional basándote en el contenido del documento y toda la información disponible.

    Reglas:
    1. Si te piden información específica sobre un ítem:
       - Menciona su estado exacto (Excelente, Bueno, Regular, Deficiente)
       - Si el estado es "No Marcada" o "No Determinado", indícalo claramente
       - Incluye cualquier observación relevante asociada con ese ítem

    2. Si te piden un resumen:
       - Debe ser conciso y directo
       - Menciona el estado general de limpieza: ${cleaningSummary.overallStatus}
       - Destaca los elementos en estado crítico (Regular o Deficiente)
       - Incluye las observaciones más importantes

    3. Si te preguntan sobre el estado general:
       - Indica que el estado general es: ${cleaningSummary.overallStatus}
       - Explica que se basa en el análisis de ${cleaningSummary.elementsCount} elementos
       - Menciona los porcentajes de cada estado

    4. IMPORTANTE: Usa toda la información disponible para responder de la manera más precisa posible.

    5. Si no encuentras información sobre algo específico:
       - Indica claramente que no hay información disponible sobre ese tema
       - No inventes información que no esté en los datos proporcionados`;

    console.log('Enviando prompt mejorado a Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Guardar en caché
    cacheService.set(cacheKey, responseText, 1800); // 30 minutos

    return responseText;
  } catch (error) {
    console.error('Error generando respuesta de chat:', error);

    // Intentar con un prompt más simple como respaldo
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const simplePrompt = `Responde a esta pregunta sobre un documento de inspección de limpieza: "${userMessage}"

      Basado en este análisis:
      ${analysisResult}`;

      const result = await model.generateContent(simplePrompt);
      return result.response.text();
    } catch (backupError) {
      console.error('Error con el prompt de respaldo:', backupError);
      return 'Lo siento, no pude procesar tu pregunta en este momento. Por favor, intenta de nuevo más tarde.';
    }
  }
}

module.exports = {
  analyzeWithGemini,
  generateChatResponse
};
