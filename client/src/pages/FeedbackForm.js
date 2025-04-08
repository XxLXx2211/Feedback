import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaPlus } from 'react-icons/fa';
import { getEmployees } from '../services/employeeService';
import { getCompanies } from '../services/companyService';
import { getQuestions } from '../services/questionService';
import { getCategories, getQuestionsByCategory } from '../services/categoryService';
import { createFeedback, getFeedback, updateFeedback } from '../services/feedbackService';
import './FeedbackForm.css';

const FeedbackForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Estados para el formulario
  const [titulo, setTitulo] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Estados para datos
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar empleados, empresas, preguntas y categorías
        const [employeesData, companiesData, questionsData, categoriesData] = await Promise.all([
          getEmployees(),
          getCompanies(),
          getQuestions(),
          getCategories()
        ]);

        setEmployees(employeesData);
        setCompanies(companiesData);
        setQuestions(questionsData);
        setCategories(categoriesData);

        // Si estamos en modo edición, cargar el feedback
        if (isEditMode) {
          const feedbackData = await getFeedback(id);

          // Llenar el formulario con los datos del feedback
          setTitulo(feedbackData.titulo);
          setEmpleadoId(feedbackData.empleado._id);
          setEmpresaId(feedbackData.empresa?._id || '');
          setAnonimo(feedbackData.anonimo);

          // TODO: Cargar las preguntas seleccionadas
        }

        setError('');
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  // Manejar cambios en la selección de preguntas
  const handleQuestionToggle = (questionId) => {
    setSelectedQuestions(prevSelected => {
      if (prevSelected.includes(questionId)) {
        return prevSelected.filter(id => id !== questionId);
      } else {
        return [...prevSelected, questionId];
      }
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!empleadoId) {
      setError('Debes seleccionar un empleado');
      return;
    }

    if (selectedQuestions.length === 0) {
      setError('Debes seleccionar al menos una pregunta');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const feedbackData = {
        titulo,
        empleado: empleadoId,
        empresa: empresaId || undefined,
        anonimo,
        preguntas: selectedQuestions.map(id => ({ pregunta: id }))
      };

      if (isEditMode) {
        await updateFeedback(id, feedbackData);
        setSuccessMessage('Feedback actualizado correctamente');
      } else {
        const result = await createFeedback(feedbackData);
        setSuccessMessage('Feedback creado correctamente');

        // Si se creó un enlace, mostrar mensaje adicional
        console.log('Resultado de crear feedback:', result);

        if (result.link && result.link.t) {
          const linkUrl = `${window.location.origin}/feedback/form/${result.link.t}`;
          console.log('URL del enlace:', linkUrl);

          await navigator.clipboard.writeText(linkUrl);
          setSuccessMessage('Feedback creado correctamente. Se ha copiado el enlace al portapapeles.');
        } else {
          console.error('No se pudo obtener un token válido:', result);
          setSuccessMessage('Feedback creado correctamente, pero no se pudo generar un enlace.');
        }
      }

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/feedback');
      }, 2000);
    } catch (err) {
      console.error('Error al guardar feedback:', err);
      setError('Error al guardar el feedback. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
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
    <div className="feedback-form-page">
      <Container>
        <div className="page-header">
          <h1 className="page-title">{isEditMode ? 'Editar Feedback' : 'Nuevo Feedback'}</h1>
          <p className="page-description">
            {isEditMode
              ? 'Modifica los datos del feedback existente'
              : 'Crea una nueva evaluación de desempeño para un empleado'}
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

        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Título</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ej: Evaluación de desempeño trimestral"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Empleado</Form.Label>
                    <Form.Select
                      value={empleadoId}
                      onChange={(e) => setEmpleadoId(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar empleado</option>
                      {employees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.nombre_completo} - {employee.puesto}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Empresa</Form.Label>
                    <Form.Select
                      value={empresaId}
                      onChange={(e) => setEmpresaId(e.target.value)}
                    >
                      <option value="">Sin empresa</option>
                      {companies.map(company => (
                        <option key={company._id} value={company._id}>
                          {company.nombre}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Evaluación anónima"
                      checked={anonimo}
                      onChange={(e) => setAnonimo(e.target.checked)}
                      className="mt-4"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Selecciona las preguntas para la evaluación</h4>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => navigate('/categories')}
                  >
                    <FaPlus className="me-1" /> Categorías
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => navigate('/questions')}
                  >
                    <FaPlus className="me-1" /> Preguntas
                  </Button>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Seleccionar por categoría</Form.Label>
                <Form.Select
                  value={selectedCategory}
                  onChange={async (e) => {
                    const categoryId = e.target.value;
                    setSelectedCategory(categoryId);

                    if (categoryId) {
                      try {
                        // Obtener preguntas de la categoría seleccionada
                        const categoryQuestions = await getQuestionsByCategory(categoryId);

                        // Agregar todas las preguntas de la categoría a las seleccionadas
                        const questionIds = categoryQuestions.map(q => q._id);

                        // Filtrar para no duplicar preguntas ya seleccionadas
                        const newSelectedQuestions = [
                          ...selectedQuestions,
                          ...questionIds.filter(id => !selectedQuestions.includes(id))
                        ];

                        setSelectedQuestions(newSelectedQuestions);
                      } catch (err) {
                        console.error('Error al cargar preguntas de la categoría:', err);
                      }
                    }
                  }}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {questions.length === 0 ? (
                <Alert variant="info">
                  No hay preguntas disponibles. <Link to="/questions">Haz clic aquí para crear preguntas</Link>.
                </Alert>
              ) : (
                <div className="questions-container">
                  {questions.map(question => (
                    <div key={question._id} className="question-item">
                      <Form.Check
                        type="checkbox"
                        id={`question-${question._id}`}
                        label={question.texto}
                        checked={selectedQuestions.includes(question._id)}
                        onChange={() => handleQuestionToggle(question._id)}
                      />
                      <small className="text-muted d-block">
                        Tipo: {question.tipo_respuesta === 'escala' ? 'Escala (1-5)' :
                              question.tipo_respuesta === 'si_no' ? 'Sí/No' : 'Texto'}
                      </small>
                    </div>
                  ))}
                </div>
              )}

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/feedback')}
                  className="d-flex align-items-center"
                >
                  <FaArrowLeft className="me-2" /> Volver
                </Button>

                <Button
                  variant="primary"
                  type="submit"
                  className="d-flex align-items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" /> Guardar
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default FeedbackForm;
