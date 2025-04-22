import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Modal, Form, Badge } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaHistory, FaEye } from 'react-icons/fa';
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyFeedback } from '../services/companyService';
import './Companies.css';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para el historial de feedbacks
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [companyHistory, setCompanyHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentCompanyForHistory, setCurrentCompanyForHistory] = useState(null);

  // Estado para el modal de formulario
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar empresas al montar el componente
  useEffect(() => {
    loadCompanies();
  }, []);

  // Función para cargar las empresas
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(data);
      setError('');
    } catch (err) {
      setError('Error al cargar las empresas. Por favor, intenta de nuevo.');
      console.error('Error al cargar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el modal en modo creación
  const handleCreate = () => {
    setFormData({
      nombre: '',
      ubicacion: ''
    });
    setEditingId(null);
    setFormErrors({});
    setShowModal(true);
  };

  // Función para abrir el modal en modo edición
  const handleEdit = (company) => {
    setFormData({
      nombre: company.nombre,
      ubicacion: company.ubicacion || ''
    });
    setEditingId(company._id);
    setFormErrors({});
    setShowModal(true);
  };

  // Función para manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Función para validar el formulario
  const validateForm = () => {
    const errors = {};

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre de la empresa es obligatorio';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Función para guardar la empresa (crear o actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // Actualizar empresa existente
        await updateCompany(editingId, formData);
        setSuccessMessage('Empresa actualizada correctamente');
      } else {
        // Crear nueva empresa
        await createCompany(formData);
        setSuccessMessage('Empresa creada correctamente');
      }

      // Recargar la lista de empresas
      await loadCompanies();

      // Cerrar el modal
      setShowModal(false);

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(editingId ? 'Error al actualizar la empresa' : 'Error al crear la empresa');
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Función para mostrar el historial de feedbacks de una empresa
  const handleShowHistory = async (companyId, companyName) => {
    try {
      setLoadingHistory(true);
      setCurrentCompanyForHistory({ id: companyId, name: companyName });

      console.log('Solicitando historial para la empresa:', companyId);
      const history = await getCompanyFeedback(companyId);
      console.log('Historial recibido:', history);

      setCompanyHistory(history);
      setShowHistoryModal(true);
    } catch (err) {
      setError('Error al cargar el historial de feedbacks. Por favor, intenta de nuevo.');
      console.error('Error al cargar historial de feedbacks:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Función para eliminar una empresa
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.')) {
      try {
        await deleteCompany(id);
        setCompanies(companies.filter(company => company._id !== id));
        setSuccessMessage('Empresa eliminada correctamente');

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        setError('Error al eliminar la empresa. Por favor, intenta de nuevo.');
        console.error('Error al eliminar empresa:', err);
      }
    }
  };

  return (
    <div className="companies-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Gestión de Empresas</h1>
          <p className="page-description">
            Administra las empresas para asociarlas con los empleados en el sistema de feedback
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
              onClick={handleCreate}
            >
              <FaPlus className="me-2" /> Nueva Empresa
            </Button>
          </Col>
        </Row>

        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Cargando empresas...</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-5">
                <FaBuilding size={48} className="text-muted mb-3" />
                <p className="mb-3 text-muted">No hay empresas registradas</p>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                >
                  Registrar Primera Empresa
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="companies-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Ubicación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(company => (
                      <tr key={company._id}>
                        <td className="company-name">{company.nombre}</td>
                        <td>{company.ubicacion || '-'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              title="Editar"
                              onClick={() => handleEdit(company)}
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              title="Ver historial de feedbacks"
                              onClick={() => handleShowHistory(company._id, company.nombre)}
                            >
                              <FaHistory />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              title="Eliminar"
                              onClick={() => handleDelete(company._id)}
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

      {/* Modal para crear/editar empresa */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Empresa' : 'Nueva Empresa'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                isInvalid={!!formErrors.nombre}
                placeholder="Nombre de la empresa"
                required
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.nombre}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ubicación</Form.Label>
              <Form.Control
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ciudad o ubicación de la empresa"
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
              disabled={submitting}
            >
              {submitting ? (
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

      {/* Modal para mostrar el historial de feedbacks */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Historial de Feedbacks - {currentCompanyForHistory?.name || 'Empresa'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando historial...</p>
            </div>
          ) : companyHistory.length === 0 ? (
            <div className="text-center py-4">
              <FaBuilding className="no-data-icon" style={{ fontSize: '3rem', opacity: 0.5 }} />
              <p className="mt-3 text-muted">No hay feedbacks para esta empresa</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Empleado</th>
                    <th>Estado</th>
                    <th>Puntuación</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {companyHistory.map(feedback => (
                    <tr key={feedback._id}>
                      <td>{feedback.titulo || feedback.t}</td>
                      <td>{feedback.empleado?.nombre_completo || 'N/A'}</td>
                      <td>
                        <Badge bg={feedback.completado || feedback.co ? 'success' : 'warning'}>
                          {feedback.completado || feedback.co ? 'Completado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td>
                        {(feedback.completado || feedback.co) ? (
                          <span className="fw-bold">{(feedback.puntuacion_total || feedback.p || 0).toFixed(1)}</span>
                        ) : (
                          <span className="text-muted" style={{ opacity: 0.7 }}>-</span>
                        )}
                      </td>
                      <td>{new Date(feedback.fecha_creacion || feedback.f).toLocaleDateString()}</td>
                      <td>
                        <Button
                          variant="info"
                          size="sm"
                          title="Ver detalles"
                          onClick={() => {
                            setShowHistoryModal(false);
                            window.location.href = `/feedback/${feedback._id}`;
                          }}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Companies;
