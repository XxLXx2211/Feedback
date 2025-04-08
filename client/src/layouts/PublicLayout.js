import React from 'react';
import './PublicLayout.css';

const PublicLayout = ({ children }) => {
  return (
    <div className="public-layout">
      <div className="public-content">
        {children}
      </div>
      <footer className="public-footer">
        <div className="footer-content">
          <p className="mb-0">
            &copy; {new Date().getFullYear()} Sistema de Feedback
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
