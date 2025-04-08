import React, { createContext, useState, useEffect } from 'react';
import { verifyToken } from '../services/authService';

// Crear el contexto
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay un token guardado al cargar la página
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          // Verificar el token con el servidor
          await verifyToken();
          setIsAuthenticated(true);
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error al verificar token:', error);
          // Si el token no es válido, limpiar el almacenamiento local
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Función para iniciar sesión
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      // Intentar cerrar sesión en el servidor
      await import('../services/authService').then(module => module.logout());
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
    } finally {
      // Siempre limpiar el almacenamiento local
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
