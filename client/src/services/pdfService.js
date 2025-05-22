import API from './api';

/**
 * Subir un archivo PDF
 * @param {FormData} formData - Datos del formulario con el archivo y metadatos
 * @returns {Promise<Object>} - Documento creado
 */
export const uploadPDF = async (formData) => {
  try {
    console.log('Subiendo PDF...');

    // Intentar con reintentos
    let maxRetries = 3;
    let currentAttempt = 0;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      currentAttempt = i + 1;
      try {
        const response = await API.post('/pdf/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: 20 * 1024 * 1024, // 20MB máximo
          maxBodyLength: 20 * 1024 * 1024, // 20MB máximo
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 500 // Considerar errores 4xx como respuestas válidas
        });

        if (!response.data) {
          throw new Error('No se recibió respuesta del servidor');
        }

        console.log('Respuesta del servidor:', response.data);
        return response.data;
      } catch (attemptError) {
        lastError = attemptError;
        if (currentAttempt < maxRetries) {
          console.log(`Error al subir PDF (intento ${currentAttempt}/${maxRetries}). Reintentando en ${currentAttempt} segundo(s)...`);
          await new Promise(resolve => setTimeout(resolve, currentAttempt * 1000));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError;
  } catch (error) {
    console.error('Error al subir PDF:', error.response ? error.response.data : error.message);

    // Crear un mensaje de error más descriptivo
    let errorMessage = 'Error desconocido al subir el PDF';

    if (error.response) {
      // El servidor respondió con un código de error
      errorMessage = error.response.data.error || `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta del servidor. Intenta nuevamente en unos momentos.';
    } else {
      // Error al configurar la solicitud
      errorMessage = error.message;
    }

    // Crear un nuevo error con el mensaje descriptivo
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

/**
 * Obtener todos los documentos con paginación
 * @param {Object} options - Opciones de paginación
 * @param {number} options.page - Número de página (por defecto: 1)
 * @param {number} options.limit - Límite de documentos por página (por defecto: 20)
 * @returns {Promise<Object>} - Objeto con documentos y metadatos de paginación
 */
export const getDocuments = async (options = {}) => {
  try {
    console.log('Solicitando lista de documentos...');

    // Parámetros de paginación
    const page = options.page || 1;
    const limit = options.limit || 20;

    // Intentar con reintentos
    let maxRetries = 3;
    let currentAttempt = 0;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      currentAttempt = i + 1;
      try {
        console.log(`Obteniendo documentos PDF (página ${page}, límite ${limit})...`);

        const response = await API.get('/pdf/documents', {
          params: { page, limit },
          // Configuración adicional para mejorar la estabilidad
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 500 // Considerar errores 4xx como respuestas válidas
        });

        console.log('Respuesta del servidor:', response);

        if (!response.data) {
          throw new Error('No se recibió respuesta del servidor');
        }

        // Verificar si la respuesta tiene el nuevo formato paginado
        if (response.data.documents && response.data.pagination) {
          console.log(`Se recibieron ${response.data.documents.length} documentos (página ${response.data.pagination.currentPage} de ${response.data.pagination.totalPages})`);
          // Devolver la respuesta completa con documentos y metadatos de paginación
          return response.data;
        } else if (Array.isArray(response.data)) {
          // Compatibilidad con el formato anterior (array de documentos)
          console.log(`Se recibieron ${response.data.length} documentos (formato antiguo)`);
          // Convertir al nuevo formato
          return {
            documents: response.data,
            pagination: {
              totalDocuments: response.data.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: response.data.length,
              hasNextPage: false,
              hasPrevPage: false
            }
          };
        } else {
          console.warn('Formato de respuesta inesperado:', response.data);
          // Devolver un objeto vacío con el formato esperado
          return {
            documents: [],
            pagination: {
              totalDocuments: 0,
              totalPages: 0,
              currentPage: 1,
              pageSize: limit,
              hasNextPage: false,
              hasPrevPage: false
            }
          };
        }
      } catch (attemptError) {
        lastError = attemptError;
        if (currentAttempt < maxRetries) {
          console.log(`Error al obtener documentos (intento ${currentAttempt}/${maxRetries}). Reintentando en ${currentAttempt * 0.5} segundo(s)...`);
          await new Promise(resolve => setTimeout(resolve, currentAttempt * 500));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError;
  } catch (error) {
    console.error('Error al obtener documentos:', error.response ? error.response.data : error.message);

    // Crear un mensaje de error más descriptivo
    let errorMessage = 'Error desconocido al obtener documentos';

    if (error.response) {
      // El servidor respondió con un código de error
      errorMessage = error.response.data.error || error.response.data.message || `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta del servidor. Intenta recargar la página.';
    } else {
      // Error al configurar la solicitud
      errorMessage = error.message;
    }

    // Crear un nuevo error con el mensaje descriptivo
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

/**
 * Obtener un documento por ID
 * @param {string} id - ID del documento
 * @returns {Promise<Object>} - Documento
 */
export const getDocument = async (id) => {
  try {
    // Configurar un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

    const response = await API.get(`/pdf/documents/${id}`, {
      signal: controller.signal,
      timeout: 15000, // 15 segundos de timeout
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Limpiar el timeout
    clearTimeout(timeoutId);

    return response.data;
  } catch (error) {
    console.error(`Error al obtener documento ${id}:`, error.response ? error.response.data : error.message);

    // Manejar errores de timeout
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      return {
        error: true,
        errorMessage: 'El servidor tardó demasiado en responder. Por favor, intenta de nuevo más tarde.',
        status: 'timeout'
      };
    }

    // Manejar errores de red
    if (error.message && error.message.includes('Network Error')) {
      return {
        error: true,
        errorMessage: 'Error de conexión con el servidor. Por favor, verifica tu conexión a internet.',
        status: 'network_error'
      };
    }

    // Devolver un objeto de error formateado para que la interfaz pueda manejarlo
    return {
      error: true,
      errorMessage: error.response ? error.response.data.error : error.message,
      status: 'error'
    };
  }
};

/**
 * Eliminar un documento
 * @param {string} id - ID del documento
 * @returns {Promise<Object>} - Mensaje de confirmación
 */
export const deleteDocument = async (id) => {
  try {
    // Configurar un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

    const response = await API.delete(`/pdf/documents/${id}`, {
      signal: controller.signal,
      timeout: 15000 // 15 segundos de timeout
    });

    // Limpiar el timeout
    clearTimeout(timeoutId);

    return response.data;
  } catch (error) {
    console.error(`Error al eliminar documento ${id}:`, error.response ? error.response.data : error.message);

    // Crear un mensaje de error más descriptivo
    let errorMessage = 'Error desconocido al eliminar el documento';

    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      errorMessage = 'El servidor tardó demasiado en responder. El documento puede haber sido eliminado o no.';
    } else if (error.message && error.message.includes('Network Error')) {
      errorMessage = 'Error de conexión con el servidor. Por favor, verifica tu conexión a internet.';
    } else if (error.response) {
      // El servidor respondió con un código de error
      errorMessage = error.response.data.error || `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta del servidor. Intenta nuevamente en unos momentos.';
    } else {
      // Error al configurar la solicitud
      errorMessage = error.message;
    }

    // Crear un nuevo error con el mensaje descriptivo
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

/**
 * Analizar un PDF
 * @param {string} id - ID del documento
 * @param {boolean} forceRefresh - Forzar recarga del análisis ignorando caché
 * @returns {Promise<Object>} - Resultado del análisis
 */
export const analyzePDF = async (id, forceRefresh = false) => {
  try {
    console.log(`Analizando documento ${id}${forceRefresh ? ' (forzando recarga)' : ''}`);

    // Configurar un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos de timeout (reducido)

    // Preparar parámetros de consulta
    const params = forceRefresh ? { refresh: 'true' } : {};

    // Realizar la solicitud con timeout
    const response = await API.post(`/pdf/analyze/${id}`, {}, {
      signal: controller.signal,
      timeout: 20000, // 20 segundos de timeout adicional para axios (reducido)
      params: params, // Añadir parámetros de consulta
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Limpiar el timeout
    clearTimeout(timeoutId);

    console.log('Respuesta del servidor (análisis):', response);

    // Verificar la estructura de la respuesta y normalizarla
    if (response && response.data) {
      // Si la respuesta tiene la estructura esperada
      if (response.data.analysis) {
        return {
          analysis: response.data.analysis,
          formattedAnalysis: response.data.formattedAnalysis || true,
          status: 'success'
        };
      } else if (response.data.g) {
        // Si la respuesta tiene el campo g (geminiAnalysis)
        return {
          analysis: response.data.g,
          formattedAnalysis: true,
          status: 'success'
        };
      } else if (typeof response.data === 'string') {
        // Si la respuesta es un string, usarlo como análisis
        return {
          analysis: response.data,
          formattedAnalysis: true,
          status: 'success'
        };
      } else if (response.data.status === 'processing') {
        // Si el documento está en proceso
        return {
          analysis: 'El documento está siendo procesado. Por favor, intenta de nuevo en unos momentos.',
          status: 'processing',
          formattedAnalysis: true
        };
      } else {
        // Devolver la respuesta completa
        return {
          ...response.data,
          status: response.data.status || 'unknown'
        };
      }
    } else if (response && response.analysis) {
      // Si la respuesta tiene el análisis directamente
      return {
        ...response,
        status: 'success'
      };
    } else {
      // Si la respuesta no tiene la estructura esperada, crear una estructura compatible
      console.warn('Respuesta sin estructura esperada:', response);
      return {
        analysis: 'No se pudo obtener el análisis del documento.',
        formattedAnalysis: true,
        status: 'error'
      };
    }
  } catch (error) {
    // Manejar errores de timeout
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      console.error(`Timeout al analizar documento ${id}`);
      return {
        analysis: 'El servidor tardó demasiado en responder. El documento puede estar en proceso de análisis.',
        error: true,
        status: 'timeout',
        errorMessage: 'Timeout de la solicitud'
      };
    }

    // Manejar errores de red
    if (error.message && error.message.includes('Network Error')) {
      console.error(`Error de red al analizar documento ${id}`);
      return {
        analysis: 'Error de conexión con el servidor. Por favor, verifica tu conexión a internet.',
        error: true,
        status: 'network_error',
        errorMessage: 'Error de conexión'
      };
    }

    console.error(`Error al analizar documento ${id}:`, error.response ? error.response.data : error.message);
    // Devolver un objeto de error formateado para que la interfaz pueda manejarlo
    return {
      analysis: 'Error al analizar el documento. Por favor, intenta de nuevo más tarde.',
      error: true,
      status: 'error',
      errorMessage: error.response ? error.response.data.error : error.message
    };
  }
};

/**
 * Corregir errores de análisis en un documento
 * @param {string} id - ID del documento
 * @returns {Promise<Object>} - Resultado de la corrección
 */
export const fixDocumentAnalysis = async (id) => {
  try {
    console.log(`Corrigiendo análisis para documento ${id}`);

    // Configurar un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    // Realizar la solicitud con timeout
    const response = await API.post(`/pdf/fix-analysis/${id}`, {}, {
      signal: controller.signal,
      timeout: 30000, // 30 segundos de timeout
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Limpiar el timeout
    clearTimeout(timeoutId);

    console.log('Respuesta de corrección de análisis:', response);

    if (response && response.data) {
      return {
        success: true,
        analysis: response.data.analysis || 'Análisis corregido exitosamente',
        message: response.data.message || 'Corrección completada',
        elementsFound: response.data.elementsFound || 0,
        summary: response.data.summary || {}
      };
    } else {
      return {
        success: false,
        message: 'No se recibió respuesta válida del servidor'
      };
    }
  } catch (error) {
    console.error(`Error al corregir análisis para documento ${id}:`, error);

    // Devolver un objeto de error formateado
    return {
      success: false,
      error: true,
      message: error.response ? error.response.data.error : error.message
    };
  }
};

/**
 * Enviar mensaje al chat con PDF
 * @param {string} id - ID del documento
 * @param {string|object} message - Mensaje del usuario
 * @returns {Promise<Object>} - Respuesta del chat
 */
export const chatWithPDF = async (id, message) => {
  try {
    console.log(`Enviando mensaje al chat para documento ${id}:`, message);
    let payload;

    // Verificar si el mensaje es un objeto o un string
    if (typeof message === 'object' && message !== null) {
      payload = message;
    } else {
      payload = { message };
    }

    const response = await API.post(`/pdf/chat/${id}`, payload);
    console.log('Respuesta del servidor (chat):', response);
    return response;
  } catch (error) {
    console.error(`Error en chat con documento ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};
