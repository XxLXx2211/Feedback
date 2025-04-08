import API from './api';

// Obtener todos los empleados
export const getEmployees = async () => {
  try {
    const response = await API.get('/employees');
    return response.data;
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    throw error;
  }
};

// Obtener un empleado por ID
export const getEmployee = async (id) => {
  try {
    const response = await API.get(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener empleado ${id}:`, error);
    throw error;
  }
};

// Crear un nuevo empleado
export const createEmployee = async (employeeData) => {
  try {
    const response = await API.post('/employees', employeeData);
    return response.data;
  } catch (error) {
    console.error('Error al crear empleado:', error);
    throw error;
  }
};

// Actualizar un empleado
export const updateEmployee = async (id, employeeData) => {
  try {
    const response = await API.put(`/employees/${id}`, employeeData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar empleado ${id}:`, error);
    throw error;
  }
};

// Eliminar un empleado
export const deleteEmployee = async (id) => {
  try {
    const response = await API.delete(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar empleado ${id}:`, error);
    throw error;
  }
};

// Obtener historial de feedback de un empleado
export const getEmployeeFeedback = async (id) => {
  try {
    const response = await API.get(`/employees/${id}/feedback`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial de feedback del empleado ${id}:`, error);
    throw error;
  }
};
