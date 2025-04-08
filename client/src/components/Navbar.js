import React, { useContext } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import { AuthContext } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <BootstrapNavbar expand="lg" className="custom-navbar">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="navbar-brand">
          Sistema de Feedback
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/employees" className="nav-link">
              Empleados
            </Nav.Link>
            <Nav.Link as={Link} to="/feedback" className="nav-link">
              Feedback
            </Nav.Link>
            <Nav.Link as={Link} to="/pdf-analysis" className="nav-link">
              Análisis PDF
            </Nav.Link>
          </Nav>
          <Nav>
            <ThemeToggle />

            {isAuthenticated && (
              <>
                <div className="user-info">
                  <FaUser className="user-icon" />
                  <span className="username">{user?.username || 'Usuario'}</span>
                </div>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Salir
                </Button>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
