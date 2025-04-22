/**
 * Servicio especializado para la detección de estado de limpieza en PDFs
 * Versión mejorada con algoritmos avanzados de detección
 */

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

  // Verificar si la línea contiene palabras clave que indican problemas
  const lineContext = line.toLowerCase();
  const problemKeywords = ['sucio', 'sucia', 'sucias', 'manchado', 'manchada', 'manchadas', 'polvo', 'roto', 'rota', 'rotas', 'dañado', 'dañada', 'dañadas'];

  // Si la línea contiene palabras clave de problemas, probablemente no sea Excelente
  const hasProblemKeyword = problemKeywords.some(keyword => lineContext.includes(keyword));
  let problemDetected = false;

  if (hasProblemKeyword) {
    problemDetected = true;
    // console.log(`  Detectada palabra clave de problema: ${problemKeywords.filter(k => lineContext.includes(k)).join(', ')}`);
  }

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

        // Detectar si hay indicadores de orden de las casillas (mejorado)
        const hasExcelente = lineContext.includes('excelente') || lineContext.includes('e)') || lineContext.includes('e ') || lineContext.includes('excel');
        const hasBueno = lineContext.includes('bueno') || lineContext.includes('b)') || lineContext.includes('b ') || lineContext.includes('bien');
        const hasRegular = lineContext.includes('regular') || lineContext.includes('r)') || lineContext.includes('r ') || lineContext.includes('reg');
        const hasDeficiente = lineContext.includes('deficiente') || lineContext.includes('d)') || lineContext.includes('d ') || lineContext.includes('def');

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

          // Si se detectó un problema en el texto, ajustar el estado
          if (problemDetected && (position === 0 || position === 1)) {
            // Si hay palabras clave de problemas, no puede ser Excelente o Bueno
            result.state = 'Regular';
            result.confidence = 0.75;
            result.detectionMethod = 'checkbox-position-adjusted';
            console.log(`Estado ajustado a Regular debido a palabras clave de problemas en: "${line}"`);
          } else {
            result.state = position === 0 ? 'Excelente' :
                          position === 1 ? 'Bueno' :
                          position === 2 ? 'Regular' :
                          position === 3 ? 'Deficiente' : 'No determinado';
            result.confidence = 0.7;
            result.detectionMethod = 'checkbox-position';
          }
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

  // Buscar patrones adicionales de casillas en formato alternativo
  if (result.state === 'No determinado') {
    // Buscar patrones como "E B R D" con alguna marca
    const ebrdPattern = /\b([EBRD])\s+([EBRD])\s+([EBRD])\s+([EBRD])\b/i;
    const ebrdMatch = line.match(ebrdPattern);

    if (ebrdMatch) {
      // Verificar si hay alguna marca cerca (X, *, etc.)
      const lineContext = line.toLowerCase();
      if (lineContext.includes('x') || lineContext.includes('*') || lineContext.includes('✓')) {
        // Determinar qué letra está marcada
        if (lineContext.includes('e') || lineContext.includes('excel')) {
          result.state = 'Excelente';
          result.confidence = 0.8;
        } else if (lineContext.includes('b') || lineContext.includes('buen')) {
          result.state = 'Bueno';
          result.confidence = 0.8;
        } else if (lineContext.includes('r') || lineContext.includes('reg')) {
          result.state = 'Regular';
          result.confidence = 0.8;
        } else if (lineContext.includes('d') || lineContext.includes('def')) {
          result.state = 'Deficiente';
          result.confidence = 0.8;
        }
        result.detectionMethod = 'ebrd-pattern';
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
 * @param {boolean} forceRefresh - Si es true, ignora cualquier caché y genera un nuevo análisis
 * @returns {Array} - Array de objetos con información de elementos y estados
 */
function analyzeCleaningStatus(text, forceRefresh = false) {
  if (!text) return [];

  // Generar un identificador único para este texto
  const textId = Buffer.from(text.substring(0, 100)).toString('base64');

  if (forceRefresh) {
    console.log('Forzando nuevo análisis de estado de limpieza');
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
      // Usar una búsqueda más flexible para detectar elementos
      // Permitir variaciones en mayúsculas/minúsculas y espacios
      const elementLower = element.toLowerCase();
      const lineLower = line.toLowerCase();

      // Verificar si el elemento está en la línea
      if (lineLower.includes(elementLower)) {
        // Obtener líneas cercanas para contexto (hasta 5 líneas antes y después para mayor contexto)
        const surroundingLines = [];

        // Líneas anteriores
        for (let j = 1; j <= 5; j++) {
          if (i - j >= 0) {
            surroundingLines.push(lines[i - j]);
          }
        }

        // Líneas posteriores
        for (let j = 1; j <= 5; j++) {
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

  // Si se encontraron pocos elementos, intentar un enfoque más agresivo
  if (elements.length < 10) {
    console.log('Se encontraron pocos elementos, intentando enfoque alternativo para encontrar más...');

    // Buscar cualquier línea que pueda contener un estado
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Verificar si la línea contiene algún patrón de estado
      const hasStatePattern = STATE_PATTERNS.explicit.some(pattern => pattern.test(line)) ||
                             STATE_PATTERNS.checkbox.some(pattern => pattern.test(line)) ||
                             /\[[xX\*\/\\\+\-\|✓✔]\]/i.test(line) || // Casillas marcadas
                             /\b[EBRD]\b/i.test(line); // Letras sueltas

      if (hasStatePattern) {
        // Buscar el elemento más cercano en las líneas cercanas
        let elementFound = false;

        // Buscar en líneas anteriores y posteriores (mayor rango)
        for (let j = -5; j <= 5; j++) {
          if (i + j >= 0 && i + j < lines.length && j !== 0) {
            const nearLine = lines[i + j];
            const nearLineLower = nearLine.toLowerCase();

            for (const element of CLEANING_ELEMENTS) {
              const elementLower = element.toLowerCase();
              // Verificar si el elemento está en la línea y no ha sido detectado aún
              if (nearLineLower.includes(elementLower) && !elements.some(e => e.element === element)) {
                // Detectar estado en la línea actual con más contexto
                const surroundingLines = [];

                // Añadir más líneas de contexto
                for (let k = -3; k <= 3; k++) {
                  if (i + k >= 0 && i + k < lines.length) {
                    surroundingLines.push(lines[i + k]);
                  }
                }

                const stateInfo = detectStateInLine(line, surroundingLines);

                // Solo agregar si se detectó un estado válido
                if (stateInfo.state !== 'No determinado') {
                  // Agregar el elemento a la lista
                  elements.push({
                    element,
                    state: stateInfo.state,
                    observation: stateInfo.observation || nearLine, // Usar la línea cercana como observación si no hay otra
                    confidence: stateInfo.confidence * 0.8, // Reducir confianza por ser enfoque alternativo
                    detectionMethod: `alternative-${stateInfo.detectionMethod}`
                  });

                  elementFound = true;
                  break;
                }
              }
            }

            if (elementFound) break;
          }
        }
      }
    }
  }

  // Buscar elementos adicionales que puedan estar en el documento pero no se detectaron
  // Esto es útil para formularios con formato no estándar
  for (const element of CLEANING_ELEMENTS) {
    // Verificar si el elemento ya fue detectado
    if (!elements.some(e => e.element === element)) {
      // Buscar el elemento en el texto completo
      const elementLower = element.toLowerCase();
      let elementFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();

        if (line.includes(elementLower)) {
          // Buscar estados en líneas cercanas
          const surroundingLines = [];

          // Añadir líneas de contexto
          for (let j = -5; j <= 5; j++) {
            if (i + j >= 0 && i + j < lines.length) {
              surroundingLines.push(lines[i + j]);
            }
          }

          // Buscar estados en las líneas cercanas
          let stateFound = false;

          for (const nearLine of surroundingLines) {
            // Buscar patrones de estado
            if (/\[[xX\*\/\\\+\-\|✓✔]\]/i.test(nearLine) || /\b[EBRD]\b/i.test(nearLine)) {
              const stateInfo = detectStateInLine(nearLine, surroundingLines);

              if (stateInfo.state !== 'No determinado') {
                // Agregar el elemento a la lista
                elements.push({
                  element,
                  state: stateInfo.state,
                  observation: stateInfo.observation || '',
                  confidence: stateInfo.confidence * 0.7, // Reducir confianza aún más
                  detectionMethod: `deep-search-${stateInfo.detectionMethod}`
                });

                stateFound = true;
                elementFound = true;
                break;
              }
            }
          }

          if (stateFound) break;
        }
      }
    }
  }

  // Ya no guardamos en caché, siempre usamos resultados frescos
  console.log(`Se encontraron ${elements.length} elementos de limpieza`);

  // Verificar si hay elementos con observaciones que indican problemas
  const problemKeywords = ['sucio', 'sucia', 'sucias', 'manchado', 'manchada', 'manchadas', 'polvo', 'roto', 'rota', 'rotas', 'dañado', 'dañada', 'dañadas'];

  // Revisar cada elemento para ajustar estados basados en observaciones
  for (const element of elements) {
    if (element.state === 'Excelente' || element.state === 'Bueno') {
      // Si la observación contiene palabras clave de problemas, ajustar el estado
      if (element.observation && problemKeywords.some(keyword => element.observation.toLowerCase().includes(keyword))) {
        console.log(`Ajustando estado de "${element.element}" de ${element.state} a Regular debido a observación: "${element.observation}"`);
        element.state = 'Regular';
        element.confidence = Math.max(element.confidence * 0.9, 0.6); // Reducir confianza pero mantener un mínimo
        element.detectionMethod += '-adjusted';
      }
    }
  }

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
      statusEmoji: '❓',
      statusDescription: 'No determinado',
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

  // Determinar estado general según las reglas especificadas
  let overallStatus = 'No determinado';
  let statusEmoji = '';
  let statusDescription = '';

  // Si hay suficientes elementos con estado determinado
  const determinedCount = elementsCount - statusCounts['No determinado'];

  if (determinedCount > 0) {
    // Calcular porcentajes para cada estado
    const excellentGoodCount = statusCounts['Excelente'] + statusCounts['Bueno'];
    const regularCount = statusCounts['Regular'];
    const deficientCount = statusCounts['Deficiente'];

    // Porcentaje de elementos en estado Regular
    const regularPercentage = (regularCount / determinedCount) * 100;

    // Aplicar las reglas especificadas:
    // 1. Todo en Excelente/Bien: 🟢Excelente
    // 2. Todo en Excelente/Bien pero con dos o más en regular: 🟢🔸Bien con Observaciones
    // 3. Más del 25% en Regular: 🟡Regular
    // 4. Más de 3 en Deficiente: 🔴Deficiente

    // Imprimir información detallada para depuración
    console.log(`Resumen de estado de limpieza: Excelente=${statusCounts['Excelente']}, Bueno=${statusCounts['Bueno']}, Regular=${statusCounts['Regular']}, Deficiente=${statusCounts['Deficiente']}, No determinado=${statusCounts['No determinado']}`);
    console.log(`Porcentajes: Regular=${regularPercentage.toFixed(2)}%, ExcelenteGood=${excellentGoodCount}/${determinedCount}`);

    // Aplicar reglas en orden de prioridad
    if (deficientCount > 3) {
      overallStatus = 'Deficiente';
      statusEmoji = '🔴';
      statusDescription = 'Deficiente';
      console.log('Regla aplicada: Más de 3 elementos deficientes');
    } else if (regularPercentage > 25) {
      overallStatus = 'Regular';
      statusEmoji = '🟡';
      statusDescription = 'Regular';
      console.log('Regla aplicada: Más del 25% en Regular');
    } else if (regularCount >= 2 && (excellentGoodCount + regularCount === determinedCount)) {
      // Corregido: Asegurarse de que solo hay elementos Excelente/Bueno y Regular
      overallStatus = 'Bueno con Observaciones';
      statusEmoji = '🟢🔸';
      statusDescription = 'Bien con Observaciones';
      console.log('Regla aplicada: Todo Excelente/Bueno con 2+ Regular');
    } else if (excellentGoodCount === determinedCount) {
      overallStatus = 'Excelente';
      statusEmoji = '🟢';
      statusDescription = 'Excelente';
      console.log('Regla aplicada: Todo Excelente/Bueno');
    } else {
      // Caso por defecto si no cumple ninguna regla específica
      overallStatus = 'Bueno';
      statusEmoji = '🟢';
      statusDescription = 'Bueno';
      console.log('Regla aplicada: Caso por defecto');
    }

    // Imprimir el resultado final
    console.log(`Resultado final: ${statusEmoji} ${statusDescription}`);

    // Verificar si hay muchos elementos 'No determinado' y ajustar el resultado
    const undeterminedPercentage = (statusCounts['No determinado'] / elementsCount) * 100;
    if (undeterminedPercentage > 30) {
      console.log(`Advertencia: ${undeterminedPercentage.toFixed(2)}% de elementos sin estado determinado`);
    }
  }

  return {
    overallStatus,
    statusEmoji,
    statusDescription,
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

  // Agrupar elementos por nombre para evitar duplicados
  const elementMap = new Map();

  // Procesar cada elemento y mantener solo la mejor detección para cada nombre de elemento
  elements.forEach(element => {
    const key = element.element;

    // Si el elemento ya existe, verificar cuál tiene mayor confianza
    if (elementMap.has(key)) {
      const existing = elementMap.get(key);
      if (element.confidence > existing.confidence) {
        elementMap.set(key, element);
      }
    } else {
      elementMap.set(key, element);
    }
  });

  // Convertir el mapa a un array ordenado alfabéticamente
  const uniqueElements = Array.from(elementMap.values())
    .sort((a, b) => a.element.localeCompare(b.element));

  // Generar el texto de análisis
  let analysisText = 'Resultado análisis:\n';

  // Agregar cada elemento con su estado
  uniqueElements.forEach(element => {
    analysisText += `El estado del "${element.element}" es ${element.state}\n`;
  });

  // Agregar observaciones
  const observations = uniqueElements
    .filter(element => element.observation)
    .map(element => `• ${element.element}: ${element.observation}`);

  if (observations.length > 0) {
    analysisText += '\nObservaciones:\n';
    analysisText += observations.join('\n');
  }

  // Agregar resumen
  const summary = generateCleaningSummary(uniqueElements);
  analysisText += `\n\nResumen:\n`;
  analysisText += `• Estado general: ${summary.statusEmoji} ${summary.statusDescription}\n`;
  analysisText += `• Elementos analizados: ${summary.elementsCount}\n`;
  analysisText += `• Excelente: ${summary.statusCounts.Excelente} (${summary.statusPercentages.Excelente}%)\n`;
  analysisText += `• Bueno: ${summary.statusCounts.Bueno} (${summary.statusPercentages.Bueno}%)\n`;
  analysisText += `• Regular: ${summary.statusCounts.Regular} (${summary.statusPercentages.Regular}%)\n`;
  analysisText += `• Deficiente: ${summary.statusCounts.Deficiente} (${summary.statusPercentages.Deficiente}%)\n`;

  return analysisText;
}

module.exports = {
  analyzeCleaningStatus,
  generateCleaningSummary,
  generateGeminiAnalysisText,
  CLEANING_ELEMENTS
};
