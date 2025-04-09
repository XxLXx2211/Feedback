import API from './api';

// Obtener empleados con sus puntuaciones
export const getEmployeesWithScores = async () => {
  try {
    const response = await API.get('/dashboard/employees-with-scores');
    return response.data;
  } catch (error) {
    console.error('Error al obtener empleados con puntuaciones:', error);
    throw error;
  }
};

// Obtener estadísticas generales del dashboard
export const getDashboardStats = async () => {
  try {
    const response = await API.get('/dashboard/stats');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    throw error;
  }
};
