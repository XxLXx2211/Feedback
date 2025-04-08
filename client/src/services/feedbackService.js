import API from './api';

// Obtener todos los feedbacks
export const getFeedbacks = async () => {
  try {
    const response = await API.get('/feedback');
    return response.data;
  } catch (error) {
    console.error('Error al obtener feedbacks:', error);
    throw error;
  }
};

// Obtener un feedback por ID
export const getFeedback = async (id) => {
  try {
    const response = await API.get(`/feedback/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener feedback ${id}:`, error);
    throw error;
  }
};

// Crear un nuevo feedback
export const createFeedback = async (feedbackData) => {
  try {
    const response = await API.post('/feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error('Error al crear feedback:', error);
    throw error;
  }
};

// Actualizar un feedback
export const updateFeedback = async (id, feedbackData) => {
  try {
    const response = await API.put(`/feedback/${id}`, feedbackData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar feedback ${id}:`, error);
    throw error;
  }
};

// Eliminar un feedback
export const deleteFeedback = async (id) => {
  try {
    const response = await API.delete(`/feedback/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar feedback ${id}:`, error);
    throw error;
  }
};

// Enviar respuestas a un feedback
export const submitAnswers = async (id, answersData) => {
  try {
    const response = await API.post(`/feedback/${id}/submit`, answersData);
    return response.data;
  } catch (error) {
    console.error(`Error al enviar respuestas al feedback ${id}:`, error);
    throw error;
  }
};

// Obtener un feedback por token
export const getFeedbackByToken = async (token) => {
  try {
    const response = await API.get(`/feedback/token/${token}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener feedback por token ${token}:`, error);
    throw error;
  }
};

// Obtener todos los enlaces de feedback
export const getFeedbackLinks = async () => {
  try {
    const response = await API.get('/feedback/links');
    return response.data;
  } catch (error) {
    console.error('Error al obtener enlaces de feedback:', error);
    throw error;
  }
};

// Crear un nuevo enlace de feedback
export const createFeedbackLink = async (linkData) => {
  try {
    const response = await API.post('/feedback/links', linkData);
    return response.data;
  } catch (error) {
    console.error('Error al crear enlace de feedback:', error);
    throw error;
  }
};

// Actualizar un enlace de feedback
export const updateFeedbackLink = async (id, linkData) => {
  try {
    const response = await API.put(`/feedback/links/${id}`, linkData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar enlace de feedback ${id}:`, error);
    throw error;
  }
};
