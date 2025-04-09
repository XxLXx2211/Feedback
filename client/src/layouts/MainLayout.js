import React from 'react';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { Container } from 'react-bootstrap';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <main className="main-content">
        <Container fluid className="px-4">
          {children}
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
