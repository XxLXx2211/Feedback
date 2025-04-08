import API from './api';
import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Obtener todas las preguntas
export const getQuestions = async () => {
  try {
    console.log('Llamando a la API en:', `${API_URL}/questions`);
    const response = await axios.get(`${API_URL}/questions`);
    console.log('Respuesta de la API (preguntas):', response);
    return response.data;
  } catch (error) {
    console.error('Error detallado al obtener preguntas:', error.response ? error.response.data : error.message);
    console.error('Error al obtener preguntas:', error);
    throw error;
  }
};

// Obtener una pregunta por ID
export const getQuestion = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/questions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener pregunta ${id}:`, error);
    throw error;
  }
};

// Crear una nueva pregunta
export const createQuestion = async (questionData) => {
  try {
    const response = await axios.post(`${API_URL}/questions`, questionData);
    return response.data;
  } catch (error) {
    console.error('Error al crear pregunta:', error);
    throw error;
  }
};

// Actualizar una pregunta
export const updateQuestion = async (id, questionData) => {
  try {
    const response = await axios.put(`${API_URL}/questions/${id}`, questionData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar pregunta ${id}:`, error);
    throw error;
  }
};

// Eliminar una pregunta
export const deleteQuestion = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/questions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar pregunta ${id}:`, error);
    throw error;
  }
};
