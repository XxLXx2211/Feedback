import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Table, Badge, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaQuestion, FaLayerGroup } from 'react-icons/fa';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../services/questionService';
import { getCategories } from '../services/categoryService';
import './Questions.css';

const Questions = () => {
  // Estados para la lista de preguntas
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para el formulario de pregunta
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [texto, setTexto] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState('escala');
  const [importancia, setImportancia] = useState(3);
  const [categoriaId, setCategoriaId] = useState('');
  const [preguntasSiNo, setPreguntasSiNo] = useState([{ texto: '', orden: 1 }]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para las categorías
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Cargar preguntas y categorías al montar el componente
  useEffect(() => {
    loadQuestions();
    loadCategories();
  }, []);

  // Función para cargar las preguntas
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await getQuestions();
      setQuestions(data);
      setError('');
    } catch (err) {
      setError('Error al cargar las preguntas. Por favor, intenta de nuevo.');
      console.error('Error al cargar preguntas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar las categorías
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Función para abrir el modal de nueva pregunta
  const handleOpenModal = () => {
    setEditingQuestion(null);
    setTexto('');
    setTipoRespuesta('escala');
    setImportancia(3);
    setCategoriaId('');
    setPreguntasSiNo([{ texto: '', orden: 1 }]);
    setFormError('');
    setShowModal(true);
  };

  // Función para abrir el modal de edición
  const handleEdit = (question) => {
    setEditingQuestion(question);
    setTexto(question.texto);
    setTipoRespuesta(question.tipo_respuesta);
    setImportancia(question.importancia);
    setCategoriaId(question.categoria ? question.categoria._id : '');
    setPreguntasSiNo(question.preguntas_si_no?.length > 0
      ? question.preguntas_si_no
      : [{ texto: '', orden: 1 }]);
    setFormError('');
    setShowModal(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Función para agregar una subpregunta de sí/no
  const handleAddSubQuestion = () => {
    setPreguntasSiNo([
      ...preguntasSiNo,
      { texto: '', orden: preguntasSiNo.length + 1 }
    ]);
  };

  // Función para eliminar una subpregunta de sí/no
  const handleRemoveSubQuestion = (index) => {
    if (preguntasSiNo.length > 1) {
      const updatedSubQuestions = preguntasSiNo.filter((_, i) => i !== index);
      // Actualizar el orden
      const reorderedSubQuestions = updatedSubQuestions.map((q, i) => ({
        ...q,
        orden: i + 1
      }));
      setPreguntasSiNo(reorderedSubQuestions);
    }
  };

  // Función para actualizar una subpregunta de sí/no
  const handleSubQuestionChange = (index, value) => {
    const updatedSubQuestions = [...preguntasSiNo];
    updatedSubQuestions[index].texto = value;
    setPreguntasSiNo(updatedSubQuestions);
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos
    if (!texto.trim()) {
      setFormError('El texto de la pregunta es obligatorio');
      return;
    }

    // Validar subpreguntas si el tipo es sí/no
    if (tipoRespuesta === 'si_no') {
      const emptySubQuestions = preguntasSiNo.some(q => !q.texto.trim());
      if (emptySubQuestions) {
        setFormError('Todas las subpreguntas deben tener texto');
        return;
      }
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const questionData = {
        texto,
        tipo_respuesta: tipoRespuesta,
        importancia: parseInt(importancia),
        categoria: categoriaId || undefined,
        preguntas_si_no: tipoRespuesta === 'si_no' ? preguntasSiNo : []
      };

      if (editingQuestion) {
        // Actualizar pregunta existente
        await updateQuestion(editingQuestion._id, questionData);
        setSuccessMessage('Pregunta actualizada correctamente');
      } else {
        // Crear nueva pregunta
        await createQuestion(questionData);
        setSuccessMessage('Pregunta creada correctamente');
      }

      // Recargar preguntas y cerrar modal
      await loadQuestions();
      handleCloseModal();

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setFormError('Error al guardar la pregunta. Por favor, intenta de nuevo.');
      console.error('Error al guardar pregunta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para eliminar una pregunta
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.')) {
      try {
        await deleteQuestion(id);
        await loadQuestions();
        setSuccessMessage('Pregunta eliminada correctamente');

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        setError('Error al eliminar la pregunta. Por favor, intenta de nuevo.');
        console.error('Error al eliminar pregunta:', err);
      }
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
    <div className="questions-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Gestión de Preguntas</h1>
          <p className="page-description">
            Administra las preguntas para las evaluaciones de desempeño
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
              className="d-flex align-items-center"
              onClick={handleOpenModal}
            >
              <FaPlus className="me-2" /> Nueva Pregunta
            </Button>
          </Col>
        </Row>

        <Card>
          <Card.Body>
            {questions.length === 0 ? (
              <div className="text-center py-5">
                <FaQuestion className="no-data-icon" />
                <p className="mb-3 text-muted">No hay preguntas registradas</p>
                <Button
                  variant="primary"
                  onClick={handleOpenModal}
                >
                  Agregar Primera Pregunta
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Texto</th>
                      <th>Tipo de Respuesta</th>
                      <th>Importancia</th>
                      <th>Categoría</th>
                      <th>Subpreguntas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(question => (
                      <tr key={question._id}>
                        <td>{question.texto}</td>
                        <td>
                          <Badge bg="info">
                            {question.tipo_respuesta === 'escala' ? 'Escala (1-5)' :
                             question.tipo_respuesta === 'si_no' ? 'Sí/No' : 'Texto'}
                          </Badge>
                        </td>
                        <td>{question.importancia}</td>
                        <td>
                          {question.categoria ? (
                            <Badge bg="success">{question.categoria.nombre}</Badge>
                          ) : (
                            <span className="text-muted">Sin categoría</span>
                          )}
                        </td>
                        <td>
                          {question.tipo_respuesta === 'si_no' && question.preguntas_si_no?.length > 0 ? (
                            <Badge bg="secondary">{question.preguntas_si_no.length}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              title="Editar"
                              onClick={() => handleEdit(question)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              title="Eliminar"
                              onClick={() => handleDelete(question._id)}
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

      {/* Modal para agregar/editar pregunta */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingQuestion ? 'Editar Pregunta' : 'Nueva Pregunta'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && (
            <Alert variant="danger">{formError}</Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.nombre}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Texto de la pregunta</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: ¿Cómo calificarías el desempeño del empleado?"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de respuesta</Form.Label>
                  <Form.Select
                    value={tipoRespuesta}
                    onChange={(e) => setTipoRespuesta(e.target.value)}
                  >
                    <option value="escala">Escala (1-5)</option>
                    <option value="si_no">Sí/No</option>
                    <option value="texto">Texto</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Importancia (1-5)</Form.Label>
                  <Form.Select
                    value={importancia}
                    onChange={(e) => setImportancia(e.target.value)}
                  >
                    <option value="1">1 - Baja</option>
                    <option value="2">2</option>
                    <option value="3">3 - Media</option>
                    <option value="4">4</option>
                    <option value="5">5 - Alta</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    La importancia afecta el peso de esta pregunta en la puntuación final.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {tipoRespuesta === 'si_no' && (
              <div className="subquestions-container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Subpreguntas de Sí/No</h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleAddSubQuestion}
                  >
                    <FaPlus className="me-1" /> Agregar
                  </Button>
                </div>

                {preguntasSiNo.map((subQuestion, index) => (
                  <div key={index} className="subquestion-item mb-2">
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="text"
                        placeholder={`Subpregunta ${index + 1}`}
                        value={subQuestion.texto}
                        onChange={(e) => handleSubQuestionChange(index, e.target.value)}
                        required
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveSubQuestion(index)}
                        disabled={preguntasSiNo.length === 1}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Questions;
