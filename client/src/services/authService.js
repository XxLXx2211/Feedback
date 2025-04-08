import API from './api';

// Iniciar sesión
export const login = async (credentials) => {
  try {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
};

// Verificar token
export const verifyToken = async () => {
  try {
    const response = await API.get('/auth/verify');
    return response.data;
  } catch (error) {
    console.error('Error al verificar token:', error);
    throw error;
  }
};

// Cerrar sesión
export const logout = async () => {
  try {
    const response = await API.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Incluso si hay un error, eliminamos el token local
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw error;
  }
};
