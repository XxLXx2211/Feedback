import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaList, FaLayerGroup } from 'react-icons/fa';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { getQuestionsByCategory } from '../services/categoryService';
import './Categories.css';

const Categories = () => {
  // Estados para la lista de categorías
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para el formulario de categoría
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para mostrar preguntas de una categoría
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryQuestions, setCategoryQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Cargar categorías al montar el componente
  useEffect(() => {
    loadCategories();
  }, []);

  // Función para cargar las categorías
  const loadCategories = async () => {
    try {
      setLoading(true);
      console.log('Intentando cargar categorías...');
      const data = await getCategories();
      console.log('Categorías cargadas:', data);
      setCategories(data);
      setError('');
    } catch (err) {
      console.error('Error detallado al cargar categorías:', err.response ? err.response.data : err.message);
      setError('Error al cargar las categorías. Por favor, intenta de nuevo.');
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el modal de nueva categoría
  const handleOpenModal = () => {
    setEditingCategory(null);
    setNombre('');
    setDescripcion('');
    setFormError('');
    setShowModal(true);
  };

  // Función para abrir el modal de edición de categoría
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNombre(category.nombre);
    setDescripcion(category.descripcion || '');
    setFormError('');
    setShowModal(true);
  };

  // Función para guardar la categoría (crear o actualizar)
  const handleSaveCategory = async (e) => {
    e.preventDefault();

    // Validar formulario
    if (!nombre.trim()) {
      setFormError('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const categoryData = {
        nombre,
        descripcion
      };

      if (editingCategory) {
        // Actualizar categoría existente
        await updateCategory(editingCategory._id, categoryData);
        setSuccessMessage('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await createCategory(categoryData);
        setSuccessMessage('Categoría creada correctamente');
      }

      // Recargar categorías y cerrar modal
      await loadCategories();
      setShowModal(false);

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setFormError('Error al guardar la categoría. Por favor, intenta de nuevo.');
      console.error('Error al guardar categoría:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para eliminar una categoría
  const handleDeleteCategory = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.')) {
      try {
        await deleteCategory(id);
        setSuccessMessage('Categoría eliminada correctamente');

        // Recargar categorías
        await loadCategories();

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        setError('Error al eliminar la categoría. Por favor, intenta de nuevo.');
        console.error('Error al eliminar categoría:', err);
      }
    }
  };

  // Función para ver las preguntas de una categoría
  const handleViewQuestions = async (category) => {
    try {
      setSelectedCategory(category);
      setLoadingQuestions(true);
      setCategoryQuestions([]);
      setShowQuestionsModal(true);

      const questions = await getQuestionsByCategory(category._id);
      setCategoryQuestions(questions);
    } catch (err) {
      console.error('Error al cargar preguntas de la categoría:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <div className="categories-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Gestión de Categorías</h1>
          <p className="page-description">
            Administra las categorías para agrupar preguntas en las evaluaciones de desempeño
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
              <FaPlus className="me-2" /> Nueva Categoría
            </Button>
          </Col>
        </Row>

        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Cargando categorías...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-5">
                <FaLayerGroup className="no-data-icon" />
                <p className="mb-3 text-muted">No hay categorías registradas</p>
                <Button
                  variant="primary"
                  onClick={handleOpenModal}
                >
                  Crear Primera Categoría
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category._id}>
                        <td className="category-name">{category.nombre}</td>
                        <td>{category.descripcion || '-'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="info"
                              size="sm"
                              title="Ver preguntas"
                              onClick={() => handleViewQuestions(category)}
                            >
                              <FaList />
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              title="Editar"
                              onClick={() => handleEditCategory(category)}
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              title="Eliminar"
                              onClick={() => handleDeleteCategory(category._id)}
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

      {/* Modal para crear/editar categoría */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveCategory}>
          <Modal.Body>
            {formError && (
              <Alert variant="danger">{formError}</Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la categoría"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción de la categoría (opcional)"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para ver preguntas de una categoría */}
      <Modal
        show={showQuestionsModal}
        onHide={() => setShowQuestionsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Preguntas de la categoría: {selectedCategory?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingQuestions ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando preguntas...</p>
            </div>
          ) : categoryQuestions.length === 0 ? (
            <Alert variant="info">
              No hay preguntas asignadas a esta categoría.
            </Alert>
          ) : (
            <div className="category-questions-list">
              {categoryQuestions.map(question => (
                <div key={question._id} className="question-item mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h5>{question.texto}</h5>
                      <div>
                        <Badge bg="info" className="me-2">
                          {question.tipo_respuesta === 'escala' ? 'Escala (1-5)' :
                           question.tipo_respuesta === 'si_no' ? 'Sí/No' : 'Texto'}
                        </Badge>
                        <Badge bg="secondary">
                          Importancia: {question.importancia}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {question.tipo_respuesta === 'si_no' && question.preguntas_si_no && question.preguntas_si_no.length > 0 && (
                    <div className="mt-3">
                      <h6>Subpreguntas:</h6>
                      <ul className="ps-3">
                        {question.preguntas_si_no.map((subq, index) => (
                          <li key={index}>{subq.texto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuestionsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Categories;
