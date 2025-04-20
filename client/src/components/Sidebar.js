import React, { useContext } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUsers, FaComments, FaFilePdf, FaSignOutAlt, FaQuestion, FaBuilding, FaLayerGroup, FaSearchPlus } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  // Verificar si la ruta actual coincide con el enlace
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">Sistema de<br/>Feedback</h3>
      </div>

      <div className="sidebar-content">
        <Nav className="flex-column">
          <Nav.Link
            as={Link}
            to="/"
            className={`sidebar-link ${isActive('/') ? 'active' : ''}`}
          >
            <FaHome className="sidebar-icon" />
            <span>Inicio</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/employees"
            className={`sidebar-link ${isActive('/employees') ? 'active' : ''}`}
          >
            <FaUsers className="sidebar-icon" />
            <span>Empleados</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/feedback"
            className={`sidebar-link ${isActive('/feedback') ? 'active' : ''}`}
          >
            <FaComments className="sidebar-icon" />
            <span>Feedback</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/questions"
            className={`sidebar-link ${isActive('/questions') ? 'active' : ''}`}
          >
            <FaQuestion className="sidebar-icon" />
            <span>Preguntas</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/companies"
            className={`sidebar-link ${isActive('/companies') ? 'active' : ''}`}
          >
            <FaBuilding className="sidebar-icon" />
            <span>Empresas</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/categories"
            className={`sidebar-link ${isActive('/categories') ? 'active' : ''}`}
          >
            <FaLayerGroup className="sidebar-icon" />
            <span>Categorías</span>
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/supervision"
            className={`sidebar-link ${isActive('/supervision') ? 'active' : ''}`}
          >
            <FaSearchPlus className="sidebar-icon" />
            <span>Supervisión Efectiva</span>
          </Nav.Link>
        </Nav>
      </div>

      <div className="sidebar-footer">
        <div className="theme-toggle-container">
          <ThemeToggle />
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <FaSignOutAlt className="sidebar-icon" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
