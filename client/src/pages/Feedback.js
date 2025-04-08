import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaLink, FaEye, FaClipboardCheck } from 'react-icons/fa';
import ThemeText from '../components/ThemeText';
import { getFeedbacks, deleteFeedback, createFeedbackLink } from '../services/feedbackService';
import './Feedback.css';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [currentFeedbackId, setCurrentFeedbackId] = useState(null);

  // Cargar feedbacks al montar el componente
  useEffect(() => {
    loadFeedbacks();
  }, []);

  // Función para cargar los feedbacks
  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await getFeedbacks();
      setFeedbacks(data);
      setError('');
    } catch (err) {
      setError('Error al cargar los feedbacks. Por favor, intenta de nuevo.');
      console.error('Error al cargar feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar un feedback
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este feedback? Esta acción no se puede deshacer.')) {
      try {
        await deleteFeedback(id);
        setFeedbacks(feedbacks.filter(feedback => feedback._id !== id));
        setSuccessMessage('Feedback eliminado correctamente');

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        setError('Error al eliminar el feedback. Por favor, intenta de nuevo.');
        console.error('Error al eliminar feedback:', err);
      }
    }
  };

  // Función para crear un enlace de feedback
  const handleCreateLink = async (id) => {
    try {
      setCreatingLink(true);
      setCurrentFeedbackId(id);

      const response = await createFeedbackLink({ feedback: id });

      console.log('Respuesta del servidor:', response);

      // Verificar que la respuesta contenga el token
      if (!response || !response.link || !response.link.t) {
        console.error('Respuesta inválida del servidor:', response);
        throw new Error('No se pudo obtener un token válido del servidor');
      }

      // Copiar el enlace al portapapeles
      const linkUrl = `${window.location.origin}/feedback/form/${response.link.t}`;
      await navigator.clipboard.writeText(linkUrl);

      setSuccessMessage('Enlace creado y copiado al portapapeles');

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Error al crear el enlace. Por favor, intenta de nuevo.');
      console.error('Error al crear enlace:', err);
    } finally {
      setCreatingLink(false);
      setCurrentFeedbackId(null);
    }
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <div className="feedback-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Gestión de Feedback</h1>
          <p className="page-description">
            Crea y administra evaluaciones de desempeño para tus empleados de manera eficiente y organizada
          </p>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
            {successMessage}
          </Alert>
        )}

        <Row className="mb-4">
          <Col>
            <Button
              variant="primary"
              className="btn-new-feedback d-flex align-items-center"
              onClick={() => window.location.href = '/feedback/new'}
            >
              <FaPlus className="me-2" /> Nuevo Feedback
            </Button>
          </Col>
        </Row>

        <Card className="feedback-card">
          <Card.Body>
            {feedbacks.length === 0 ? (
              <div className="text-center py-5">
                <FaClipboardCheck className="no-data-icon" />
                <p className="mb-3 text-muted">No hay feedbacks disponibles</p>
                <Button
                  variant="primary"
                  onClick={() => window.location.href = '/feedback/new'}
                >
                  Crear Primer Feedback
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="feedback-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Empleado</th>
                      <th>Empresa</th>
                      <th>Estado</th>
                      <th>Puntuación</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map(feedback => (
                      <tr key={feedback._id}>
                        <td><ThemeText>{feedback.titulo}</ThemeText></td>
                        <td><ThemeText>{feedback.empleado?.nombre_completo || 'N/A'}</ThemeText></td>
                        <td><ThemeText>{feedback.empresa?.nombre || 'N/A'}</ThemeText></td>
                        <td>
                          <Badge bg={feedback.completado ? 'success' : 'warning'}>
                            {feedback.completado ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td>
                          {feedback.completado ? (
                            <ThemeText className="fw-bold">{feedback.puntuacion_total.toFixed(1)}</ThemeText>
                          ) : (
                            <ThemeText className="text-muted" style={{ opacity: 0.7 }}>-</ThemeText>
                          )}
                        </td>
                        <td><ThemeText>{new Date(feedback.fecha_creacion).toLocaleDateString()}</ThemeText></td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="info"
                              className="btn-action"
                              title="Ver detalles"
                              onClick={() => window.location.href = `/feedback/${feedback._id}`}
                            >
                              <FaEye />
                            </Button>

                            <Button
                              variant="primary"
                              className="btn-action"
                              title="Editar"
                              onClick={() => window.location.href = `/feedback/edit/${feedback._id}`}
                              disabled={feedback.completado}
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              variant="success"
                              className="btn-action"
                              title="Crear enlace"
                              onClick={() => handleCreateLink(feedback._id)}
                              disabled={feedback.completado || (creatingLink && currentFeedbackId === feedback._id)}
                            >
                              {creatingLink && currentFeedbackId === feedback._id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <FaLink />
                              )}
                            </Button>

                            <Button
                              variant="danger"
                              className="btn-action"
                              title="Eliminar"
                              onClick={() => handleDelete(feedback._id)}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Feedback;
