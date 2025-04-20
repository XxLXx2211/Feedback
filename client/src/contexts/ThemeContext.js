import React, { createContext } from 'react';

// Crear el contexto
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Siempre usar tema claro
  const theme = 'light';

  // Función vacía para el toggle (no hace nada)
  const toggleTheme = () => {
    // No hacer nada, siempre mantener tema claro
    console.log('Tema siempre claro');
  };

  // Asegurar que el tema sea claro
  document.documentElement.removeAttribute('data-theme');
  document.body.classList.remove('dark-mode');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
