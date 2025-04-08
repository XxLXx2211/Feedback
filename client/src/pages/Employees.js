import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaUserTie } from 'react-icons/fa';
// Importamos los servicios para conectar con la API
import { getEmployees, createEmployee, deleteEmployee } from '../services/employeeService';
import { getCompanies } from '../services/companyService';
import './Employees.css';

const Employees = () => {
  // Estados para la lista de empleados
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para el formulario de nuevo empleado
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [puesto, setPuesto] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar empleados y empresas al montar el componente
  useEffect(() => {
    loadEmployees();
    loadCompanies();
  }, []);

  // Función para cargar empleados
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar los empleados. Por favor, intenta de nuevo.');
      console.error('Error al cargar empleados:', err);
      setLoading(false);
    }
  };

  // Función para cargar empresas
  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      // Si hay un error al cargar las empresas, usar datos por defecto
      const mockCompanies = [
        { _id: '1', nombre: 'TechSolutions Inc.' },
        { _id: '2', nombre: 'Global Innovations' },
        { _id: '3', nombre: 'Future Enterprises' }
      ];
      setCompanies(mockCompanies);
    }
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos
    if (!nombre.trim() || !apellido.trim() || !cedula.trim() || !puesto.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }

    // Validar formato de cédula (solo números)
    if (!/^\d+$/.test(cedula)) {
      setFormError('La cédula debe contener solo números');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // Crear objeto de empleado
      const employeeData = {
        nombre_completo: `${nombre} ${apellido}`,
        cedula,
        puesto,
        empresa: empresaId || undefined
      };

      // Crear el empleado en la base de datos
      const newEmployee = await createEmployee(employeeData);

      // Recargar la lista de empleados
      await loadEmployees();

      // Cerrar modal y limpiar formulario
      handleCloseModal();

      // Mostrar mensaje de éxito
      setSuccessMessage('Empleado agregado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);

      setIsSubmitting(false);
    } catch (err) {
      setFormError('Error al crear el empleado. Por favor, intenta de nuevo.');
      console.error('Error al crear empleado:', err);
      setIsSubmitting(false);
    }
  };

  // Función para eliminar un empleado
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.')) {
      try {
        // Eliminar el empleado de la base de datos
        await deleteEmployee(id);

        // Recargar la lista de empleados
        await loadEmployees();

        // Mostrar mensaje de éxito
        setSuccessMessage('Empleado eliminado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError('Error al eliminar el empleado. Por favor, intenta de nuevo.');
        console.error('Error al eliminar empleado:', err);
      }
    }
  };

  // Funciones para manejar el modal
  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNombre('');
    setApellido('');
    setCedula('');
    setPuesto('');
    setEmpresaId('');
    setFormError('');
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
    <div className="employees-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Gestión de Empleados</h1>
          <p className="page-description">
            Administra la información de los empleados de tu empresa
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
              <FaPlus className="me-2" /> Nuevo Empleado
            </Button>
          </Col>
        </Row>

        <Card>
          <Card.Body>
            {employees.length === 0 ? (
              <div className="text-center py-5">
                <FaUserTie className="no-data-icon" />
                <p className="mb-3 text-muted">No hay empleados registrados</p>
                <Button
                  variant="primary"
                  onClick={handleOpenModal}
                >
                  Agregar Primer Empleado
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Nombre Completo</th>
                      <th>Cédula</th>
                      <th>Puesto</th>
                      <th>Empresa</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(employee => (
                      <tr key={employee._id}>
                        <td>{employee.nombre_completo}</td>
                        <td>{employee.cedula}</td>
                        <td>{employee.puesto}</td>
                        <td>
                          {employee.empresa ? (
                            <Badge bg="info" className="company-badge">
                              {employee.empresa.nombre}
                            </Badge>
                          ) : (
                            <span className="text-muted">No asignada</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              title="Editar"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              title="Eliminar"
                              onClick={() => handleDelete(employee._id)}
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

      {/* Modal para agregar empleado */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Nuevo Empleado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && (
            <Alert variant="danger">{formError}</Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ingrese el nombre"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Apellido</Form.Label>
                  <Form.Control
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ingrese el apellido"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Cédula</Form.Label>
              <Form.Control
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ingrese la cédula (solo números)"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cargo</Form.Label>
              <Form.Control
                type="text"
                value={puesto}
                onChange={(e) => setPuesto(e.target.value)}
                placeholder="Ingrese el cargo"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Empresa</Form.Label>
              <Form.Select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                <option value="">Seleccionar empresa</option>
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Empleado'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Employees;
