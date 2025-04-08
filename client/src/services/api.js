import axios from 'axios';

// Crear una instancia de axios con la URL base
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
});

// Interceptor para agregar el token a las solicitudes
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de respuesta
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el error es 401 (no autorizado), redirigir al login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default API;
