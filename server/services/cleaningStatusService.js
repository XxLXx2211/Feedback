/**
 * Servicio especializado para la detección de estado de limpieza en PDFs
 * Versión mejorada con algoritmos avanzados de detección
 */

const cacheService = require('./cacheService');

// Elementos comunes en formularios de inspección de limpieza
const CLEANING_ELEMENTS = [
  'Techos', 'Sobretechos', 'Bajo Silos', 'Sobre Silos', 'Azoteas', 'Tuberías',
  'Rocas', 'Vidrios', 'Escalera', 'Rejillas', 'Mallas', 'Elevadores', 'Paredes',
  'Rack', 'Puntos Muertos', 'Pisos', 'Santamaría', 'Extintores', 'Lámparas',
  'Puertas', 'Cortinas', 'Portones', 'Plataformas', 'Defensas', 'Vigas',
  'Baños', 'Nevera', 'Micro Ondas', 'Comedor', 'Canaletas', 'Canales',
  'Camineria', 'Avisos', 'Silos', 'Umbrales de Ventanas', 'Ventanas',
  'Drenajes', 'Desagües', 'Alcantarillas', 'Trampas', 'Sumideros',
  'Áreas Verdes', 'Jardines', 'Estacionamiento', 'Pasillos', 'Oficinas',
  'Almacén', 'Depósito', 'Área de Producción', 'Área de Empaque', 'Área de Despacho'
];

// Patrones para detectar estados
const STATE_PATTERNS = {
  // Patrones para casillas marcadas
  checkbox: [
    // Casillas con X, *, +, /, \, |, etc.
    /\[\s*([X\*\/\\\+\-\|✓✔])\s*\]/i,
    // Casillas con texto como "marcada", "check", etc.
    /\[\s*(marcad[ao]|check|si|sí)\s*\]/i,
    // Casillas con números o letras dentro
    /\[\s*([0-9EBRD])\s*\]/i
  ],

  // Patrones para estados explícitos
  explicit: [
    // Estado como letra sola (E, B, R, D)
    /\b([EBRD])\b/,
    // Estado como palabra completa
    /\b(Excelente|Bueno|Regular|Deficiente)\b/i,
    // Estado con prefijo
    /Estado:?\s*(Excelente|Bueno|Regular|Deficiente|[EBRD])/i,
    // Estado con "es" o "está"
    /\bes\s+(Excelente|Bueno|Regular|Deficiente|[EBRD])\b/i,
    /\bestá\s+(Excelente|Bueno|Regular|Deficiente|[EBRD])\b/i
  ],

  // Patrones para observaciones
  observation: [
    // Observación con etiqueta
    /Observaci[oó]n[:\s]+(.*)/i,
    // Comentario con etiqueta
    /Comentario[:\s]+(.*)/i,
    // Nota con etiqueta
    /Nota[:\s]+(.*)/i
  ]
};

/**
 * Normaliza el estado detectado a un formato estándar
 * @param {string} state - Estado detectado
 * @returns {string} - Estado normalizado (Excelente, Bueno, Regular, Deficiente, No determinado)
 */
function normalizeState(state) {
  if (!state) return 'No determinado';

  const normalized = state.trim().toUpperCase();

  if (normalized === 'E' || normalized.includes('EXCELENTE')) {
    return 'Excelente';
  } else if (normalized === 'B' || normalized.includes('BUENO')) {
    return 'Bueno';
  } else if (normalized === 'R' || normalized.includes('REGULAR')) {
    return 'Regular';
  } else if (normalized === 'D' || normalized.includes('DEFICIENTE')) {
    return 'Deficiente';
  } else if (normalized.includes('NO MARCADA') || normalized.includes('NO DETERMINADO')) {
    return normalized;
  }

  return 'No determinado';
}

/**
 * Detecta el estado de limpieza en una línea de texto
 * @param {string} line - Línea de texto
 * @param {Array} surroundingLines - Líneas cercanas para contexto
 * @returns {Object} - Información del estado detectado
 */
function detectStateInLine(line, surroundingLines = []) {
  // Resultado por defecto
  const result = {
    state: 'No determinado',
    confidence: 0,
    observation: '',
    detectionMethod: 'none'
  };

  // Verificar patrones de casillas marcadas
  for (const pattern of STATE_PATTERNS.checkbox) {
    const match = line.match(pattern);
    if (match) {
      // Determinar estado basado en la posición de la marca
      const positions = [];
      let pos = 0;
      let matchPos;
      const regex = new RegExp(pattern, 'gi');

      while ((matchPos = regex.exec(line)) !== null) {
        positions.push(pos);
        pos++;
      }

      if (positions.length > 0) {
        // Analizar el contexto para determinar qué representa cada posición
        const lineContext = line.toLowerCase();

        // Detectar si hay indicadores de orden de las casillas
        const hasExcelente = lineContext.includes('excelente') || lineContext.includes('e)');
        const hasBueno = lineContext.includes('bueno') || lineContext.includes('b)');
        const hasRegular = lineContext.includes('regular') || lineContext.includes('r)');
        const hasDeficiente = lineContext.includes('deficiente') || lineContext.includes('d)');

        // Si tenemos al menos 3 indicadores, podemos determinar el orden
        if ([hasExcelente, hasBueno, hasRegular, hasDeficiente].filter(Boolean).length >= 3) {
          // Determinar la posición de cada estado en la línea
          const positions = {
            Excelente: lineContext.indexOf('excelente'),
            Bueno: lineContext.indexOf('bueno'),
            Regular: lineContext.indexOf('regular'),
            Deficiente: lineContext.indexOf('deficiente')
          };

          // Encontrar la posición de la marca [X]
          const markPosition = line.indexOf('[');

          // Encontrar el estado más cercano a la marca
          let closestState = 'No determinado';
          let minDistance = Infinity;

          for (const [state, position] of Object.entries(positions)) {
            if (position !== -1) {
              const distance = Math.abs(position - markPosition);
              if (distance < minDistance) {
                minDistance = distance;
                closestState = state;
              }
            }
          }

          result.state = closestState;
          result.confidence = 0.9;
          result.detectionMethod = 'checkbox-context';
        } else {
          // Usar el método tradicional basado en posición
          const position = positions[0];
          result.state = position === 0 ? 'Excelente' :
                        position === 1 ? 'Bueno' :
                        position === 2 ? 'Regular' :
                        position === 3 ? 'Deficiente' : 'No determinado';
          result.confidence = 0.7;
          result.detectionMethod = 'checkbox-position';
        }
      }
      break;
    }
  }

  // Verificar patrones de estados explícitos
  if (result.state === 'No determinado') {
    for (const pattern of STATE_PATTERNS.explicit) {
      const match = line.match(pattern);
      if (match) {
        const stateText = match[1];
        result.state = normalizeState(stateText);
        result.confidence = 0.8;
        result.detectionMethod = 'explicit';
        break;
      }
    }
  }

  // Buscar observaciones en la línea actual
  for (const pattern of STATE_PATTERNS.observation) {
    const match = line.match(pattern);
    if (match && match[1]) {
      result.observation = match[1].trim();
      break;
    }
  }

  // Si no encontramos observación en la línea actual, buscar en las líneas cercanas
  if (!result.observation && surroundingLines.length > 0) {
    for (const nearLine of surroundingLines) {
      for (const pattern of STATE_PATTERNS.observation) {
        const match = nearLine.match(pattern);
        if (match && match[1]) {
          result.observation = match[1].trim();
          break;
        }
      }
      if (result.observation) break;

      // Si la línea no contiene ningún elemento de limpieza y no es muy larga,
      // considerarla como una posible observación
      if (!CLEANING_ELEMENTS.some(element => nearLine.includes(element)) &&
          nearLine.length < 100 && nearLine.length > 3) {
        result.observation = nearLine.trim();
        break;
      }
    }
  }

  return result;
}

/**
 * Analiza un texto completo para detectar estados de limpieza de todos los elementos
 * @param {string} text - Texto completo del PDF
 * @param {boolean} forceRefresh - Si es true, ignora la caché y genera un nuevo análisis
 * @returns {Array} - Array de objetos con información de elementos y estados
 */
function analyzeCleaningStatus(text, forceRefresh = false) {
  if (!text) return [];

  // Usar caché si está disponible y no se fuerza recarga
  const cacheKey = `cleaning_status_${Buffer.from(text.substring(0, 100)).toString('base64')}`;

  if (!forceRefresh) {
    const cachedResult = cacheService.get(cacheKey);

    if (cachedResult) {
      console.log('Usando resultado en caché para análisis de estado de limpieza');
      return cachedResult;
    }
  } else {
    console.log('Forzando nuevo análisis de estado de limpieza, ignorando caché');
    // Invalidar caché existente
    cacheService.del(cacheKey);
  }

  console.log('Analizando estado de limpieza en texto...');

  // Dividir el texto en líneas
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Elementos identificados
  const elements = [];

  // Buscar elementos en el texto
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Verificar si la línea contiene alguno de los elementos de limpieza
    for (const element of CLEANING_ELEMENTS) {
      if (line.includes(element)) {
        // Obtener líneas cercanas para contexto (hasta 3 líneas antes y después)
        const surroundingLines = [];

        // Líneas anteriores
        for (let j = 1; j <= 3; j++) {
          if (i - j >= 0) {
            surroundingLines.push(lines[i - j]);
          }
        }

        // Líneas posteriores
        for (let j = 1; j <= 3; j++) {
          if (i + j < lines.length) {
            surroundingLines.push(lines[i + j]);
          }
        }

        // Detectar estado en la línea actual con contexto
        const stateInfo = detectStateInLine(line, surroundingLines);

        // Agregar el elemento a la lista
        elements.push({
          element,
          state: stateInfo.state,
          observation: stateInfo.observation,
          confidence: stateInfo.confidence,
          detectionMethod: stateInfo.detectionMethod
        });

        break; // Pasar al siguiente elemento
      }
    }
  }

  // Si no se encontraron elementos, intentar un enfoque más agresivo
  if (elements.length === 0) {
    console.log('No se encontraron elementos con el enfoque estándar, intentando enfoque alternativo...');

    // Buscar cualquier línea que pueda contener un estado
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Verificar si la línea contiene algún patrón de estado
      const hasStatePattern = STATE_PATTERNS.explicit.some(pattern => pattern.test(line)) ||
                             STATE_PATTERNS.checkbox.some(pattern => pattern.test(line));

      if (hasStatePattern) {
        // Buscar el elemento más cercano en las líneas anteriores
        let elementFound = false;

        for (let j = 0; j <= 3; j++) {
          if (i - j >= 0) {
            const prevLine = lines[i - j];

            for (const element of CLEANING_ELEMENTS) {
              if (prevLine.includes(element) && !elements.some(e => e.element === element)) {
                // Detectar estado en la línea actual
                const stateInfo = detectStateInLine(line, [prevLine]);

                // Agregar el elemento a la lista
                elements.push({
                  element,
                  state: stateInfo.state,
                  observation: stateInfo.observation,
                  confidence: stateInfo.confidence * 0.8, // Reducir confianza por ser enfoque alternativo
                  detectionMethod: `alternative-${stateInfo.detectionMethod}`
                });

                elementFound = true;
                break;
              }
            }

            if (elementFound) break;
          }
        }
      }
    }
  }

  // Guardar en caché para futuras solicitudes
  cacheService.set(cacheKey, elements, 3600); // 1 hora de caché

  return elements;
}

/**
 * Genera un resumen del estado de limpieza basado en los elementos analizados
 * @param {Array} elements - Array de objetos con información de elementos y estados
 * @returns {Object} - Resumen del estado de limpieza
 */
function generateCleaningSummary(elements) {
  if (!elements || elements.length === 0) {
    return {
      overallStatus: 'No determinado',
      statusCounts: {
        Excelente: 0,
        Bueno: 0,
        Regular: 0,
        Deficiente: 0,
        'No determinado': 0
      },
      statusPercentages: {},
      elementsCount: 0,
      observations: []
    };
  }

  // Contar estados
  const statusCounts = {
    Excelente: 0,
    Bueno: 0,
    Regular: 0,
    Deficiente: 0,
    'No determinado': 0
  };

  // Recopilar observaciones
  const observations = [];

  // Procesar cada elemento
  elements.forEach(element => {
    // Incrementar contador de estado
    if (statusCounts.hasOwnProperty(element.state)) {
      statusCounts[element.state]++;
    } else {
      statusCounts['No determinado']++;
    }

    // Agregar observación si existe
    if (element.observation) {
      observations.push(`${element.element}: ${element.observation}`);
    }
  });

  // Calcular porcentajes
  const elementsCount = elements.length;
  const statusPercentages = {};

  for (const [status, count] of Object.entries(statusCounts)) {
    statusPercentages[status] = elementsCount > 0 ? Math.round((count / elementsCount) * 100) : 0;
  }

  // Determinar estado general
  let overallStatus = 'No determinado';

  // Si hay suficientes elementos con estado determinado
  const determinedCount = elementsCount - statusCounts['No determinado'];

  if (determinedCount > 0) {
    // Calcular puntuación ponderada
    const score = (
      (statusCounts['Excelente'] * 4) +
      (statusCounts['Bueno'] * 3) +
      (statusCounts['Regular'] * 2) +
      (statusCounts['Deficiente'] * 1)
    ) / determinedCount;

    // Asignar estado general basado en la puntuación
    if (score >= 3.5) {
      overallStatus = 'Excelente';
    } else if (score >= 2.5) {
      overallStatus = 'Bueno';
    } else if (score >= 1.5) {
      overallStatus = 'Regular';
    } else {
      overallStatus = 'Deficiente';
    }
  }

  return {
    overallStatus,
    statusCounts,
    statusPercentages,
    elementsCount,
    observations: observations.slice(0, 10) // Limitar a 10 observaciones para no sobrecargar
  };
}

/**
 * Genera un texto formateado para el análisis de Gemini basado en los elementos detectados
 * @param {Array} elements - Array de objetos con información de elementos y estados
 * @returns {string} - Texto formateado para Gemini
 */
function generateGeminiAnalysisText(elements) {
  if (!elements || elements.length === 0) {
    return 'No se detectaron elementos de limpieza en el documento.';
  }

  let analysisText = 'Resultado análisis:\n';

  // Agregar cada elemento con su estado
  elements.forEach(element => {
    analysisText += `El estado del "${element.element}" es ${element.state}\n`;
  });

  // Agregar observaciones
  const observations = elements
    .filter(element => element.observation)
    .map(element => `• ${element.element}: ${element.observation}`);

  if (observations.length > 0) {
    analysisText += '\nObservaciones:\n';
    analysisText += observations.join('\n');
  }

  return analysisText;
}

module.exports = {
  analyzeCleaningStatus,
  generateCleaningSummary,
  generateGeminiAnalysisText,
  CLEANING_ELEMENTS
};
