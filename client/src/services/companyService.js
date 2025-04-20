import API from './api';

// Obtener todas las empresas
export const getCompanies = async () => {
  try {
    console.log('Llamando a la API para obtener empresas');
    const response = await API.get('/companies');
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
    const response = await API.get(`/companies/${id}`);
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
    const response = await API.post('/companies', companyData);
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
    const response = await API.put(`/companies/${id}`, companyData);
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
    const response = await API.delete(`/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error detallado al eliminar empresa ${id}:`, error.response ? error.response.data : error.message);
    console.error(`Error al eliminar empresa ${id}:`, error);
    throw error;
  }
};

// Obtener historial de feedback de una empresa
export const getCompanyFeedback = async (id) => {
  try {
    console.log(`Solicitando historial de feedback para la empresa con ID: ${id}`);
    const response = await API.get(`/companies/${id}/feedback`);
    console.log('Respuesta del servidor:', response.status, response.statusText);
    console.log('Datos recibidos:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial de feedback de la empresa ${id}:`, error);
    console.error('Detalles del error:', error.response?.data || error.message);
    throw error;
  }
};
