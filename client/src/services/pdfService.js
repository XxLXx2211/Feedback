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
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
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
        retries--;

        if (retries > 0) {
          console.log(`Error al subir PDF (intento ${3-retries}/3). Reintentando...`);
          // Esperar antes de reintentar (1s, 2s, etc.)
          await new Promise(resolve => setTimeout(resolve, (3-retries) * 1000));
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
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
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
        retries--;

        if (retries > 0) {
          console.log(`Error al obtener documentos (intento ${3-retries}/3). Reintentando...`);
          // Esperar antes de reintentar (500ms, 1000ms, etc.)
          await new Promise(resolve => setTimeout(resolve, (3-retries) * 500));
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
    const response = await API.get(`/pdf/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener documento ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Eliminar un documento
 * @param {string} id - ID del documento
 * @returns {Promise<Object>} - Mensaje de confirmación
 */
export const deleteDocument = async (id) => {
  try {
    const response = await API.delete(`/pdf/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar documento ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Analizar un PDF
 * @param {string} id - ID del documento
 * @returns {Promise<Object>} - Resultado del análisis
 */
export const analyzePDF = async (id) => {
  try {
    console.log(`Analizando documento ${id}`);
    const response = await API.post(`/pdf/analyze/${id}`);
    console.log('Respuesta del servidor (análisis):', response);

    // Verificar la estructura de la respuesta y normalizarla
    if (response && response.data) {
      // Si la respuesta tiene la estructura esperada, devolverla directamente
      return response.data;
    } else if (response && response.analysis) {
      // Si la respuesta tiene el análisis directamente, devolverla
      return response;
    } else {
      // Si la respuesta no tiene la estructura esperada, crear una estructura compatible
      return {
        analysis: 'No se pudo obtener el análisis del documento.',
        formattedAnalysis: true
      };
    }
  } catch (error) {
    console.error(`Error al analizar documento ${id}:`, error.response ? error.response.data : error.message);
    // Devolver un objeto de error formateado para que la interfaz pueda manejarlo
    return {
      analysis: 'Error al analizar el documento. Por favor, intenta de nuevo más tarde.',
      error: true,
      errorMessage: error.response ? error.response.data.error : error.message
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
