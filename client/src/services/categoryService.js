import api from './api';
import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Obtener todas las categorías
export const getCategories = async () => {
  try {
    console.log('Llamando a la API en:', `${API_URL}/categories`);
    // Usar axios directamente para depurar
    const response = await axios.get(`${API_URL}/categories`);
    console.log('Respuesta de la API:', response);
    return response.data;
  } catch (error) {
    console.error('Error detallado al obtener categorías:', error.response ? error.response.data : error.message);
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

// Obtener una categoría por ID
export const getCategory = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener categoría ${id}:`, error);
    throw error;
  }
};

// Crear una nueva categoría
export const createCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_URL}/categories`, categoryData);
    return response.data;
  } catch (error) {
    console.error('Error al crear categoría:', error);
    throw error;
  }
};

// Actualizar una categoría existente
export const updateCategory = async (id, categoryData) => {
  try {
    const response = await axios.put(`${API_URL}/categories/${id}`, categoryData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar categoría ${id}:`, error);
    throw error;
  }
};

// Eliminar una categoría
export const deleteCategory = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar categoría ${id}:`, error);
    throw error;
  }
};

// Obtener preguntas por categoría
export const getQuestionsByCategory = async (categoryId) => {
  try {
    const response = await axios.get(`${API_URL}/categories/${categoryId}/questions`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener preguntas de la categoría ${categoryId}:`, error);
    throw error;
  }
};
