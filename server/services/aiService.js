const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configurar cliente de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analiza texto usando Gemini API
 * @param {string} text - Texto a analizar
 * @returns {Promise<string|null>} - Resultado del análisis o null si hay error
 */
async function analyzeWithGemini(text) {
  if (!text) return null;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Buscar secciones especiales en el texto
  let specialSections = '';
  // No buscamos secciones especiales

  // Crear un prompt mejorado que preste especial atención a las secciones especiales
  const prompt = `Analiza el siguiente texto que proviene de un formulario de inspección.

  Analiza el texto para identificar el estado de los elementos inspeccionados.

  Las casillas representan las siguientes opciones en orden:
  Primera casilla: E (Excelente)
  Segunda casilla: B (Bueno)
  Tercera casilla: R (Regular)
  Cuarta casilla: D (Deficiente)

  Busca patrones como:
  - Casillas con una X dentro
  - Casillas con un check o marca
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
  El estado del "Vidrios Internos y Externos" es [estado]
  El estado del "Escalera y Pasamanos" es [estado]
  El estado del "Rejillas de Aire Acondicionado" es [estado]
  El estado del "Rejillas Extracción de Aire" es [estado]
  El estado del "Mallas" es [estado]
  El estado del "Elevadores" es [estado]
  El estado del "Paredes" es [estado]
  El estado del "Rack de Cableados" es [estado]
  El estado del "Puntos Muertos" es [estado]
  El estado del "Pisos" es [estado]
  El estado del "Santamaría" es [estado]
  El estado del "Extintores" es [estado]
  El estado del "Lámparas" es [estado]
  El estado del "Puertas en General" es [estado]
  El estado del "Cortinas Plásticas" es [estado]
  El estado del "Portones" es [estado]
  El estado del "Plataformas" es [estado]
  El estado del "Defensas" es [estado]
  El estado del "Vigas Estructurales" es [estado]
  El estado del "Baños de Contratistas" es [estado]
  El estado del "Tolva" es [estado]
  El estado del "Nevera y Filtro de Agua Comedor" es [estado]
  El estado del "Micro Ondas Comedor" es [estado]
  El estado del "Área General de Comedor" es [estado]
  El estado del "Canaletas de Techo" es [estado]
  El estado del "Canales Fluviales" es [estado]
  El estado del "Camineria Interna" es [estado]
  El estado del "Caminaría Externa" es [estado]
  El estado del "Avisos de Señalización" es [estado]
  El estado del "Silos Externos" es [estado]
  El estado del "ESTACIÓN DE MANO" es [estado]
  El estado del "Umbrales de Ventanas" es R

  Observaciones:
  • CON POLVO DE DÍAS
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
  ${specialSections || text}`;

  try {
    console.log('Enviando prompt a Gemini...');

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(`Análisis con Gemini completado: ${responseText.length} caracteres`);

    return responseText;
  } catch (error) {
    console.error('Error al analizar con Gemini:', error);
    return null;
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // No buscamos secciones especiales
  let specialSections = '';

  // Crear un prompt mejorado que preste especial atención a las secciones especiales
  const prompt = `Eres un asistente especializado en analizar documentos de inspección. Has analizado un documento con el siguiente contenido:

    ${documentText}

    Y has generado el siguiente análisis:

    ${analysisResult}



    El usuario te pregunta: "${userMessage}"

    Responde de manera concisa y profesional basándote en el contenido del documento y tu análisis previo.

    Reglas:
    1. Si te piden información específica sobre un ítem:
       - Menciona su estado exacto (Excelente, Bueno, Regular, Deficiente)
       - Si el estado es "No Marcada" o "No Determinado", indícalo claramente
       - Incluye cualquier observación relevante asociada con ese ítem
       - Si hay texto adicional como "CON POLVO DE DÍAS", menciónalo como parte de la observación

    2. Si te piden un resumen:
       - Debe tener máximo 50 palabras
       - Enfócate solo en los hallazgos más importantes
       - Menciona solo los estados más críticos (Deficiente o Regular)
       - Usa un formato conciso y directo

    3. Si te preguntan sobre casillas marcadas:
       - Indica claramente qué casilla está marcada (E, B, R o D)
       - Explica qué significa cada casilla: E (Excelente), B (Bueno), R (Regular), D (Deficiente)
       - Si hay una observación asociada, menciónala

    4. IMPORTANTE: Usa la información disponible en el documento para responder de la manera más precisa posible.

    5. Si no encuentras información sobre algo específico:
       - Indica claramente que no hay información disponible sobre ese tema en el documento
       - No inventes información que no esté en el documento o en el análisis`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generando respuesta de chat:', error);
    return 'Lo siento, no pude procesar tu pregunta en este momento.';
  }
}

module.exports = {
  analyzeWithGemini,
  generateChatResponse
};
