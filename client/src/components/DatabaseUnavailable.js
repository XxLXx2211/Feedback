import React from 'react';
import { Container, Card, Button, Alert } from 'react-bootstrap';
import { FaDatabase, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Componente que muestra un mensaje cuando la base de datos no está disponible
 */
const DatabaseUnavailable = ({ error }) => {
  const errorMessage = error?.response?.data?.message || 'La base de datos no está disponible en este momento.';
  const errorDetails = error?.response?.data?.details || 'El servidor está funcionando en modo desarrollo sin conexión a la base de datos.';
  const errorSuggestion = error?.response?.data?.suggestion || 'Verifica la conexión a internet y las credenciales de MongoDB.';

  return (
    <Container className="py-5">
      <Card className="shadow-sm border-0">
        <Card.Body className="p-5 text-center">
          <div className="mb-4">
            <FaDatabase size={50} className="text-secondary mb-3" />
            <FaExclamationTriangle size={30} className="text-danger position-absolute" style={{ marginLeft: '-25px', marginTop: '-15px' }} />
          </div>
          
          <h2 className="mb-3">Base de datos no disponible</h2>
          <p className="text-muted mb-4">{errorMessage}</p>
          
          <Alert variant="info" className="text-start mb-4">
            <h5>Detalles:</h5>
            <p>{errorDetails}</p>
            <hr />
            <h5>Sugerencia:</h5>
            <p className="mb-0">{errorSuggestion}</p>
          </Alert>
          
          <div className="d-flex justify-content-center gap-3">
            <Button 
              variant="outline-secondary" 
              onClick={() => window.location.reload()}
            >
              Intentar nuevamente
            </Button>
            <Button 
              variant="primary" 
              onClick={() => window.location.href = '/'}
            >
              Ir al inicio
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DatabaseUnavailable;
