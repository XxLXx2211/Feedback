import React from 'react';

// Componente simplificado que siempre muestra texto oscuro
const ThemeText = ({ children, className = '', style = {} }) => {
  return (
    <span
      className={className}
      style={{
        color: '#333333',
        ...style
      }}
    >
      {children}
    </span>
  );
};

export default ThemeText;
