import React from 'react';
import './Footer.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="mb-0">
          &copy; {year} Sistema de Feedback
        </p>
      </div>
    </footer>
  );
};

export default Footer;
