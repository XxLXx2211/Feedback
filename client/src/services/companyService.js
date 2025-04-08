import API from './api';
import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Obtener todas las empresas
export const getCompanies = async () => {
  try {
    console.log('Llamando a la API en:', `${API_URL}/companies`);
    const response = await axios.get(`${API_URL}/companies`);
    console.log('Respuesta de la API (empresas):', response);
    return response.data;
  } catch (error) {
    console.error('Error detallado al obtener empresas:', error.response ? error.response.data : error.message);
    console.error('Error al obtener empresas:', error);
    throw error;
  }
};

// Obtener una empresa por ID
export const getCompany = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error detallado al obtener empresa ${id}:`, error.response ? error.response.data : error.message);
    console.error(`Error al obtener empresa ${id}:`, error);
    throw error;
  }
};

// Crear una nueva empresa
export const createCompany = async (companyData) => {
  try {
    console.log('Creando empresa con datos:', companyData);
    const response = await axios.post(`${API_URL}/companies`, companyData);
    console.log('Respuesta al crear empresa:', response);
    return response.data;
  } catch (error) {
    console.error('Error detallado al crear empresa:', error.response ? error.response.data : error.message);
    console.error('Error al crear empresa:', error);
    throw error;
  }
};

// Actualizar una empresa
export const updateCompany = async (id, companyData) => {
  try {
    const response = await axios.put(`${API_URL}/companies/${id}`, companyData);
    return response.data;
  } catch (error) {
    console.error(`Error detallado al actualizar empresa ${id}:`, error.response ? error.response.data : error.message);
    console.error(`Error al actualizar empresa ${id}:`, error);
    throw error;
  }
};

// Eliminar una empresa
export const deleteCompany = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error detallado al eliminar empresa ${id}:`, error.response ? error.response.data : error.message);
    console.error(`Error al eliminar empresa ${id}:`, error);
    throw error;
  }
};
