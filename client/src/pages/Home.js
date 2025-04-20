import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaTrophy, FaMedal, FaAward, FaSortAmountDown, FaSortAmountUp, FaBuilding } from 'react-icons/fa';
import { getEmployeesWithScores } from '../services/dashboardService';
import { getCompanies } from '../services/companyService';
import './Home.css';

const Home = () => {
  // Estado para los empleados con puntuaciones
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado para los filtros
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = mayor a menor

  // Lista de empresas para el filtro
  const [companies, setCompanies] = useState([]);

  // Cargar datos reales al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar empresas
        const companiesData = await getCompanies();
        setCompanies(companiesData);

        // Cargar empleados con puntuaciones
        const employeesData = await getEmployeesWithScores();
        console.log('Empleados con puntuaciones:', JSON.stringify(employeesData, null, 2));
        setEmployees(employeesData);

        setError('');
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtrar y ordenar empleados
  const filteredEmployees = employees
    .filter(employee => {
      // Si se seleccionaron todas las empresas, mostrar todos los empleados
      if (selectedCompany === 'all') return true;

      // Si el empleado no tiene empresa asignada y se seleccionó una empresa específica, no mostrarlo
      if (!employee.empresa || !employee.empresa._id) return false;

      // Comparar el ID de la empresa del empleado con la empresa seleccionada
      return employee.empresa._id === selectedCompany;
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.puntuacion - a.puntuacion;
      } else {
        return a.puntuacion - b.puntuacion;
      }
    });

  // Función para obtener el ícono de medalla según la posición
  const getMedalIcon = (index) => {
    if (index === 0) return <FaTrophy className="medal gold" title="Primer lugar" />;
    if (index === 1) return <FaMedal className="medal silver" title="Segundo lugar" />;
    if (index === 2) return <FaMedal className="medal bronze" title="Tercer lugar" />;
    return <FaAward className="medal" title="Destacado" />;
  };

  // Función para obtener la clase de color según la puntuación
  const getScoreColorClass = (score) => {
    if (score <= 30) return 'score-red';
    if (score >= 40 && score <= 60) return 'score-yellow';
    if (score >= 70) return 'score-green';
    return ''; // Valor por defecto
  };

  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="page-title">Ranking de Empleados</h1>
        <p className="page-description">
          Visualiza los empleados con las mejores puntuaciones en evaluaciones de desempeño
        </p>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <FaBuilding className="filter-icon" /> Filtrar por Empresa
                </Form.Label>
                <Form.Select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="all">Todas las empresas</option>
                  {companies.map(company => (
                    <option key={company._id} value={company._id}>
                      {company.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="filter-label">
                  {sortOrder === 'desc' ?
                    <FaSortAmountDown className="filter-icon" /> :
                    <FaSortAmountUp className="filter-icon" />
                  } Ordenar por Puntuación
                </Form.Label>
                <Form.Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Cargando ranking de empleados...</p>
            </div>
          ) : error ? (
            <div className="text-center py-5">
              <p className="text-danger">{error}</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-5">
              <Alert variant="info">
                No hay empleados con puntuaciones para mostrar en este momento.
                {selectedCompany !== 'all' && ' Prueba seleccionando otra empresa o mostrando todas.'}
              </Alert>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="ranking-table">
                <thead>
                  <tr>
                    <th width="60">#</th>
                    <th>Empleado</th>
                    <th>Puesto</th>
                    <th>Empresa</th>
                    <th width="120">Puntuación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, index) => (
                    <tr key={employee._id} className={index < 3 ? 'top-three' : ''}>
                      <td className="position-cell">
                        {getMedalIcon(index)}
                        <span className="position-number">{index + 1}</span>
                      </td>
                      <td>
                        <div className="employee-name">{employee.nombre_completo}</div>
                      </td>
                      <td>{employee.puesto}</td>
                      <td>
                        <Badge bg="info" className="company-badge text-white">
                          {employee.empresa && employee.empresa.nombre ? employee.empresa.nombre : 'N/A'}
                        </Badge>
                      </td>
                      <td>
                        <div className="score-container">
                          <div
                            className={`score-bar ${getScoreColorClass(employee.puntuacion)}`}
                            style={{ width: `${employee.puntuacion}%` }}
                          ></div>
                          <div className="score-text-container">
                            <span className="score-text">{employee.puntuacion}</span>
                          </div>
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
    </div>
  );
};

export default Home;
