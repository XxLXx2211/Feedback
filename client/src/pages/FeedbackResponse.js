import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, ProgressBar, Row, Col } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { FaCheck, FaTimes, FaStar, FaRegStar, FaPaperPlane } from 'react-icons/fa';
import { getFeedbackByToken, submitAnswers } from '../services/feedbackService';
import './FeedbackResponse.css';

const FeedbackResponse = () => {
  const { token } = useParams();

  // Estados para datos
  const [feedback, setFeedback] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentCategory, setCurrentCategory] = useState(null);
  const [categorizedQuestions, setCategorizedQuestions] = useState({});

  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const data = await getFeedbackByToken(token);

        if (!data || !data.feedback) {
          throw new Error('No se pudo cargar el feedback');
        }

        setFeedback(data.feedback);
        setQuestions(data.questions || []);

        // Organizar preguntas por categoría
        const questionsByCategory = {};
        data.questions.forEach(question => {
          const categoryId = question.categoria?._id || 'sin-categoria';
          const categoryName = question.categoria?.nombre || 'Sin categoría';

          if (!questionsByCategory[categoryId]) {
            questionsByCategory[categoryId] = {
              id: categoryId,
              name: categoryName,
              questions: []
            };
          }

          questionsByCategory[categoryId].questions.push(question);
        });

        setCategorizedQuestions(questionsByCategory);

        // Establecer la primera categoría como actual
        const categories = Object.values(questionsByCategory);
        if (categories.length > 0) {
          setCurrentCategory(categories[0].id);
        }

        // Inicializar respuestas vacías
        const initialAnswers = {};
        data.questions.forEach(question => {
          initialAnswers[question._id] = {
            pregunta: question._id,
            tipo: question.tipo_respuesta
          };

          // Si es pregunta de tipo si_no con subpreguntas, inicializar también las subpreguntas
          if (question.tipo_respuesta === 'si_no' && question.preguntas_si_no && question.preguntas_si_no.length > 0) {
            console.log('Pregunta Si/No con subpreguntas:', question);
            question.preguntas_si_no.forEach(subq => {
              if (subq && subq._id) {
                initialAnswers[`${question._id}_${subq._id}`] = {
                  pregunta: question._id,
                  subpregunta: subq._id,
                  tipo: 'si_no'
                };
              }
            });
          }
        });

        setAnswers(initialAnswers);
      } catch (err) {
        console.error('Error al cargar feedback:', err);
        setError('No se pudo cargar el feedback. El enlace puede ser inválido o haber expirado.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadFeedback();
    }
  }, [token]);

  // Actualizar progreso cuando cambian las respuestas
  useEffect(() => {
    if (questions.length === 0) return;

    let answeredCount = 0;
    let totalQuestions = 0;
    let answeredSiNoCount = 0;
    let totalSiNoQuestions = 0;

    // Contar preguntas respondidas
    questions.forEach(question => {
      if (question.tipo_respuesta === 'si_no') {
        // Contar preguntas de tipo si_no por separado
        totalSiNoQuestions++;
        const answer = answers[question._id];
        if (answer && answer.valor_si_no !== undefined) {
          answeredSiNoCount++;
        }
      } else {
        // Contar otras preguntas como obligatorias
        totalQuestions++;
        const answer = answers[question._id];
        if (answer) {
          if (
            (question.tipo_respuesta === 'escala' && answer.valor_escala) ||
            (question.tipo_respuesta === 'texto' && answer.valor_texto)
          ) {
            answeredCount++;
          }
        }
      }
    });

    // Calcular progreso considerando solo las preguntas obligatorias
    // pero sumando las de tipo si_no que han sido respondidas
    const totalAnswered = answeredCount + answeredSiNoCount;
    const totalRequired = totalQuestions; // Solo las obligatorias

    // Evitar división por cero
    const newProgress = totalRequired > 0 ?
      Math.min(100, Math.round((totalAnswered / totalRequired) * 100)) : 100;

    setProgress(newProgress);
  }, [answers, questions]);

  // Manejar cambio en respuestas de escala
  const handleScaleChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        valor_escala: value
      }
    }));
  };

  // Manejar cambio en respuestas de sí/no
  const handleYesNoChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        valor_si_no: value
      }
    }));
  };

  // Manejar cambio en respuestas de texto
  const handleTextChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        valor_texto: value
      }
    }));
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (categoryId) => {
    setCurrentCategory(categoryId);
  };

  // Enviar respuestas
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError('');

      // Preparar datos para enviar
      const answersArray = [];

      // Procesar preguntas principales
      for (const question of questions) {
        const answer = answers[question._id];
        if (answer) {
          // Crear objeto de respuesta con el formato correcto
          const respuesta = {
            pregunta: question._id
          };

          // Agregar el valor según el tipo de respuesta
          if (question.tipo_respuesta === 'escala' && answer.valor_escala) {
            respuesta.valor_escala = answer.valor_escala;
          } else if (question.tipo_respuesta === 'si_no' && answer.valor_si_no !== undefined) {
            respuesta.valor_si_no = answer.valor_si_no;
          } else if (question.tipo_respuesta === 'texto' && answer.valor_texto) {
            respuesta.valor_texto = answer.valor_texto;
          } else {
            // Si no hay valor válido, continuar con la siguiente pregunta
            continue;
          }

          answersArray.push(respuesta);
        }
      }

      // Procesar subpreguntas
      for (const [key, answer] of Object.entries(answers)) {
        if (key.includes('_')) {
          const [questionId] = key.split('_'); // Solo necesitamos el ID de la pregunta principal

          // Solo agregar si tiene un valor definido
          if (answer.valor_si_no !== undefined) {
            // Omitir el campo subpregunta para evitar errores de validación de ObjectId
            answersArray.push({
              pregunta: questionId,
              // No incluimos subpregunta porque causa problemas con MongoDB
              // subpregunta: subQuestionId,
              valor_si_no: answer.valor_si_no
            });
          }
        }
      }

      console.log('Respuestas a enviar:', answersArray);

      // Verificar que todas las preguntas principales tengan respuesta (excepto las de tipo si_no)
      const questionsToAnswer = questions.filter(q => q.tipo_respuesta !== 'si_no');
      const mainQuestionsAnswered = questionsToAnswer.filter(q => {
        const answer = answers[q._id];
        return answer && (
          (q.tipo_respuesta === 'escala' && answer.valor_escala) ||
          (q.tipo_respuesta === 'texto' && answer.valor_texto)
        );
      }).length;

      if (mainQuestionsAnswered < questionsToAnswer.length) {
        setError('Por favor, responde todas las preguntas antes de enviar.');
        return;
      }

      if (answersArray.length === 0) {
        setError('No hay respuestas para enviar. Por favor, completa el formulario.');
        return;
      }

      // Enviar respuestas
      const result = await submitAnswers(feedback._id, { respuestas: answersArray });
      console.log('Resultado del envío:', result);

      // Mostrar mensaje de éxito
      setSuccess(true);

      // Limpiar formulario
      setAnswers({});

    } catch (err) {
      console.error('Error al enviar respuestas:', err);
      setError('Error al enviar las respuestas. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="feedback-response-page">
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-4" />
            <h3 className="text-primary">Cargando formulario...</h3>
          </div>
        </Container>
      </div>
    );
  }

  // Renderizar mensaje de error si no se pudo cargar el feedback
  if (error && !feedback) {
    return (
      <div className="feedback-response-page">
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <Card className="error-card">
            <Card.Body className="text-center">
              <div className="logo-container mb-3">
                <img src="/images/logo.png" alt="Logo de la empresa" className="company-logo" />
              </div>
              <div className="error-icon mb-4">
                <FaTimes size={48} />
              </div>
              <h3 className="mb-3">Error al cargar el formulario</h3>
              <p className="text-muted mb-4">{error}</p>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/close.html'}
                className="pulse-button"
              >
                Cerrar Pestaña
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // Renderizar mensaje de éxito después de enviar
  if (success) {
    return (
      <div className="feedback-response-page">
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <Card className="success-card">
            <Card.Body className="text-center">
              <div className="logo-container mb-3">
                <img src="/images/logo.png" alt="Logo de la empresa" className="company-logo" />
              </div>
              <div className="success-icon mb-4">
                <FaCheck size={48} />
              </div>
              <h3 className="mb-3">¡Gracias por tu feedback!</h3>
              <p className="text-muted mb-4">Tus respuestas han sido enviadas correctamente.</p>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/close.html'}
                className="pulse-button"
              >
                Cerrar Pestaña
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // Obtener las preguntas de la categoría actual
  const currentCategoryQuestions = currentCategory && categorizedQuestions[currentCategory]
    ? categorizedQuestions[currentCategory].questions
    : [];

  return (
    <div className="feedback-response-page">
      <Container>
        <div className="page-header">
          <div className="page-header-content text-center">
            <div className="logo-container mb-4">
              <img src="/images/logo.png" alt="Logo de la empresa" className="company-logo" />
            </div>
            <h1 className="page-title">Formulario de Feedback</h1>
            <p className="page-description">
              Tu opinión es importante para nosotros. Por favor, responde las siguientes preguntas.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        <div className="feedback-header mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{feedback?.titulo || 'Formulario de Feedback'}</h5>
            <div className="progress-container">
              <span className="progress-text">{progress}% completado</span>
              <ProgressBar now={progress} variant="primary" className="custom-progress" />
            </div>
          </div>
        </div>

        {/* Información del empleado */}
        <div className="employee-info mb-3">
          <Row>
            <Col md={6}>
              <p className="mb-1"><strong>Empleado:</strong> {feedback?.empleado?.nombre_completo || 'N/A'}</p>
            </Col>
            <Col md={6}>
              {feedback?.empresa?.nombre && (
                <p></p>
              )}
            </Col>
          </Row>
        </div>

        {/* Categorías de preguntas */}
        {Object.keys(categorizedQuestions).length > 1 && (
          <div className="categories-container mb-3">
            <div className="categories-scroll">
              {Object.values(categorizedQuestions).map(category => (
                <Button
                  key={category.id}
                  variant={currentCategory === category.id ? "primary" : "outline-primary"}
                  className="category-button me-2"
                  size="sm"
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de preguntas */}
        <Form onSubmit={handleSubmit}>
            {currentCategoryQuestions.map(question => (
              <div key={question._id} className="question-card">
                <h5 className="question-text">{question.texto}</h5>

                {/* Preguntas de escala (1-5) */}
                {question.tipo_respuesta === 'escala' && (
                  <div className="rating-container">
                    {[1, 2, 3, 4, 5].map(value => (
                      <div
                        key={value}
                        className={`rating-item ${answers[question._id]?.valor_escala === value ? 'selected' : ''}`}
                        onClick={() => handleScaleChange(question._id, value)}
                      >
                        {answers[question._id]?.valor_escala >= value ? (
                          <FaStar className="star-icon" />
                        ) : (
                          <FaRegStar className="star-icon" />
                        )}
                        <span className="rating-value">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mostrar subpreguntas si existen */}
                {question.preguntas_si_no && question.preguntas_si_no.length > 0 && (
                  <div className="subquestions-container mt-3">
                    <h6>Preguntas:</h6>
                    <ul className="list-group">
                      {question.preguntas_si_no.map((subq) => (
                        <li key={subq._id} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-center w-100">
                            <span className="subq-text">{subq.texto}</span>
                            <div className="simple-buttons-container">
                              <button
                                type="button"
                                className={`simple-button no-button ${answers[`${question._id}_${subq._id}`]?.valor_si_no === false ? 'active' : ''}`}
                                onClick={() => handleYesNoChange(`${question._id}_${subq._id}`, false)}
                              >
                                No
                              </button>
                              <button
                                type="button"
                                className={`simple-button yes-button ${answers[`${question._id}_${subq._id}`]?.valor_si_no === true ? 'active' : ''}`}
                                onClick={() => handleYesNoChange(`${question._id}_${subq._id}`, true)}
                              >
                                Sí
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preguntas de texto */}
                {question.tipo_respuesta === 'texto' && (
                  <Form.Group className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Escribe tu respuesta aquí..."
                      value={answers[question._id]?.valor_texto || ''}
                      onChange={(e) => handleTextChange(question._id, e.target.value)}
                    />
                  </Form.Group>
                )}
              </div>
            ))}

          <div className="form-actions mt-4">
            <Button
              type="submit"
              variant="primary"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <FaPaperPlane className="me-2" />
                  Enviar respuestas
                </>
              )}
            </Button>
          </div>
        </Form>
      </Container>
    </div>
  );
};

export default FeedbackResponse;
