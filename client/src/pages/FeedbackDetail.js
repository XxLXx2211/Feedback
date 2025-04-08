import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Alert, Spinner, Table, Form, InputGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaLink, FaEdit, FaTrash, FaCopy, FaCheck } from 'react-icons/fa';
import { getFeedback, deleteFeedback, createFeedbackLink } from '../services/feedbackService';
import './FeedbackDetail.css';

const FeedbackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [feedbackLink, setFeedbackLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Cargar feedback al montar el componente
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const data = await getFeedback(id);

        // Cargar las preguntas para completar la información
        const { getQuestions } = require('../services/questionService');
        const questions = await getQuestions();

        // Completar la información de las respuestas con los textos de las preguntas
        if (data.respuestas && data.respuestas.length > 0) {
          data.respuestas = data.respuestas.map(respuesta => {
            const preguntaId = respuesta.pregunta;
            const pregunta = questions.find(q => q._id === preguntaId);

            if (pregunta) {
              respuesta.pregunta = pregunta;

              // Si es una subpregunta, buscar su información
              if (respuesta.subpregunta && pregunta.preguntas_si_no) {
                const subpreguntaIndex = parseInt(respuesta.subpregunta);
                if (!isNaN(subpreguntaIndex) && pregunta.preguntas_si_no[subpreguntaIndex]) {
                  respuesta.subpregunta_texto = pregunta.preguntas_si_no[subpreguntaIndex].texto;
                }
              }
            }

            return respuesta;
          });
        }

        setFeedback(data);
        setError('');
      } catch (err) {
        console.error('Error al cargar feedback:', err);
        setError('Error al cargar los datos del feedback. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, [id]);

  // Función para eliminar el feedback
  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este feedback? Esta acción no se puede deshacer.')) {
      try {
        await deleteFeedback(id);
        setSuccessMessage('Feedback eliminado correctamente');

        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigate('/feedback');
        }, 2000);
      } catch (err) {
        console.error('Error al eliminar feedback:', err);
        setError('Error al eliminar el feedback. Por favor, intenta de nuevo.');
      }
    }
  };

  // Función para crear un enlace de feedback
  const handleCreateLink = async () => {
    try {
      setCreatingLink(true);

      const response = await createFeedbackLink({ feedback: id });

      // Generar el enlace completo
      console.log('Respuesta del servidor:', response);

      if (!response || !response.link || !response.link.t) {
        console.error('Respuesta inválida del servidor:', response);
        throw new Error('No se pudo obtener un token válido del servidor');
      }

      const linkUrl = `${window.location.origin}/feedback/form/${response.link.t}`;
      setFeedbackLink(linkUrl);

      // Copiar el enlace al portapapeles
      await navigator.clipboard.writeText(linkUrl);
      setLinkCopied(true);

      setSuccessMessage('Enlace creado y copiado al portapapeles');

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
        setLinkCopied(false);
      }, 3000);
    } catch (err) {
      setError('Error al crear el enlace. Por favor, intenta de nuevo.');
      console.error('Error al crear enlace:', err);
    } finally {
      setCreatingLink(false);
    }
  };

  // Función para copiar el enlace al portapapeles
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedbackLink);
      setLinkCopied(true);

      // Restablecer el estado después de 3 segundos
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  // Función para determinar el color de la insignia de puntuación
  const getPuntuacionBadgeColor = (puntuacion) => {
    if (puntuacion >= 80) return 'success';
    if (puntuacion >= 60) return 'primary';
    if (puntuacion >= 40) return 'info';
    if (puntuacion >= 20) return 'warning';
    return 'danger';
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  // Renderizar mensaje de error si no se encuentra el feedback
  if (!feedback) {
    return (
      <Container>
        <Alert variant="danger">
          No se encontró el feedback solicitado o ha ocurrido un error.
        </Alert>
        <Button
          variant="secondary"
          onClick={() => navigate('/feedback')}
          className="d-flex align-items-center"
        >
          <FaArrowLeft className="me-2" /> Volver a la lista
        </Button>
      </Container>
    );
  }

  return (
    <div className="feedback-detail-page">
      <Container>
        <div className="page-header">
          <h1 className="page-title">Detalles del Feedback</h1>
          <p className="page-description">
            Información detallada de la evaluación de desempeño
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

        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Información General</h5>
            <div className="d-flex gap-2">
              {!feedback.completado && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/feedback/edit/${id}`)}
                  className="d-flex align-items-center"
                >
                  <FaEdit className="me-1" /> Editar
                </Button>
              )}

              {!feedback.completado && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleCreateLink}
                  disabled={creatingLink}
                  className="d-flex align-items-center"
                >
                  {creatingLink ? (
                    <Spinner animation="border" size="sm" className="me-1" />
                  ) : (
                    <FaLink className="me-1" />
                  )}
                  Crear Enlace
                </Button>
              )}

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                className="d-flex align-items-center"
              >
                <FaTrash className="me-1" /> Eliminar
              </Button>
            </div>
          </Card.Header>

          {feedbackLink && (
            <Card.Footer>
              <p className="mb-2"><strong>Enlace para compartir:</strong></p>
              <InputGroup className="mb-2">
                <Form.Control
                  value={feedbackLink}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <Button
                  variant="outline-primary"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? <FaCheck /> : <FaCopy />}
                </Button>
              </InputGroup>
              <small className="text-muted">
                Este enlace permite a cualquier persona responder al feedback sin necesidad de iniciar sesión.
                El enlace expira en 30 días.
              </small>
            </Card.Footer>
          )}
          <Card.Body>
            <Row>
              <Col md={6}>
                <p><strong>Título:</strong> {feedback.titulo}</p>
                <p><strong>Empleado:</strong> {feedback.empleado?.nombre_completo || 'N/A'}</p>
                <p><strong>Puesto:</strong> {feedback.empleado?.puesto || 'N/A'}</p>
              </Col>
              <Col md={6}>
                <p><strong>Empresa:</strong> {feedback.empresa?.nombre || 'N/A'}</p>
                <p><strong>Fecha de creación:</strong> {new Date(feedback.fecha_creacion).toLocaleDateString()}</p>
                <p>
                  <strong>Estado:</strong>{' '}
                  <Badge bg={feedback.completado ? 'success' : 'warning'}>
                    {feedback.completado ? 'Completado' : 'Pendiente'}
                  </Badge>
                </p>
                {feedback.completado && (
                  <div>
                    <p>
                      <strong>Puntuación:</strong>{' '}
                      <Badge bg={getPuntuacionBadgeColor(feedback.puntuacion_total)} className="puntuacion-badge">
                        {feedback.puntuacion_total}/100
                      </Badge>
                    </p>
                    <small className="text-muted puntuacion-info">
                      La puntuación se calcula considerando tanto las respuestas de escala (1-5) como
                      las respuestas de Sí/No. Las respuestas negativas (No) reducen la puntuación total.
                    </small>
                  </div>
                )}
                <p>
                  <strong>Anónimo:</strong>{' '}
                  <Badge bg={feedback.anonimo ? 'info' : 'secondary'}>
                    {feedback.anonimo ? 'Sí' : 'No'}
                  </Badge>
                </p>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {feedback.respuestas && feedback.respuestas.length > 0 ? (
          <Card>
            <Card.Header>
              <h5 className="mb-0">Respuestas</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Pregunta</th>
                    <th>Tipo</th>
                    <th>Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.respuestas.map((respuesta, index) => {
                    // Determinar si es una subpregunta
                    const esSubpregunta = respuesta.subpregunta !== undefined;

                    // Obtener el texto de la pregunta o subpregunta
                    let textoPregunta = respuesta.pregunta?.texto || 'Pregunta no disponible';

                    // Si es una subpregunta, mostrar el texto de la subpregunta
                    if (esSubpregunta && respuesta.subpregunta_texto) {
                      textoPregunta = `${textoPregunta} - ${respuesta.subpregunta_texto}`;
                    }

                    return (
                      <tr key={index} className={esSubpregunta ? 'subpregunta-row' : ''}>
                        <td>{textoPregunta}</td>
                        <td>
                          {respuesta.pregunta?.tipo_respuesta === 'escala' ? 'Escala (1-5)' :
                           respuesta.pregunta?.tipo_respuesta === 'si_no' ? 'Sí/No' : 'Texto'}
                        </td>
                        <td>
                          {respuesta.valor_escala !== undefined && (
                            <Badge bg="primary">{respuesta.valor_escala}/5</Badge>
                          )}
                          {respuesta.valor_si_no !== undefined && (
                            <Badge bg={respuesta.valor_si_no ? 'success' : 'danger'}>
                              {respuesta.valor_si_no ? 'Sí' : 'No'}
                            </Badge>
                          )}
                          {respuesta.valor_texto && (
                            <div className="text-response">{respuesta.valor_texto}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Body className="text-center py-4">
              <p className="mb-0 text-muted">
                {feedback.completado
                  ? 'No hay respuestas registradas para este feedback.'
                  : 'Este feedback aún no ha sido completado.'}
              </p>
            </Card.Body>
          </Card>
        )}

        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/feedback')}
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Volver a la lista
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default FeedbackDetail;
