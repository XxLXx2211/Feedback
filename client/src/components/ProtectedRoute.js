import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // Redirigir a la página de inicio de sesión si no está autenticado
  if (!isAuthenticated) {
    console.log(`Redirigiendo a login desde: ${location.pathname}`);
    // Guardar la ruta a la que intentaba acceder para redirigir después del login
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Renderizar el contenido protegido si está autenticado
  return children;
};

export default ProtectedRoute;
