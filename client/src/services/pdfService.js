import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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
        const response = await axios.post(`${API_URL}/pdf/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000, // 60 segundos de timeout para archivos grandes
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
 * Obtener todos los documentos
 * @returns {Promise<Array>} - Lista de documentos
 */
export const getDocuments = async () => {
  try {
    console.log('Solicitando lista de documentos...');
    console.log('URL de la API:', API_URL);

    // Intentar con reintentos
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        const url = `${API_URL}/pdf/documents`;
        console.log('URL completa:', url);

        const response = await axios.get(url, {
          timeout: 15000, // 15 segundos de timeout
          // Configuración adicional para mejorar la estabilidad
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 500 // Considerar errores 4xx como respuestas válidas
        });

        console.log('Respuesta del servidor:', response);

        if (!response.data) {
          throw new Error('No se recibió respuesta del servidor');
        }

        console.log(`Se recibieron ${Array.isArray(response.data) ? response.data.length : 0} documentos`);
        console.log('Datos recibidos:', response.data);
        return response.data;
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
      errorMessage = error.response.data.error || `Error ${error.response.status}: ${error.response.statusText}`;
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
    const response = await axios.get(`${API_URL}/pdf/documents/${id}`);
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
    const response = await axios.delete(`${API_URL}/pdf/documents/${id}`);
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
    const response = await axios.post(`${API_URL}/pdf/analyze/${id}`);
    console.log('Respuesta del servidor (análisis):', response);
    return response;
  } catch (error) {
    console.error(`Error al analizar documento ${id}:`, error.response ? error.response.data : error.message);
    throw error;
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

    const response = await axios.post(`${API_URL}/pdf/chat/${id}`, payload);
    console.log('Respuesta del servidor (chat):', response);
    return response;
  } catch (error) {
    console.error(`Error en chat con documento ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};
