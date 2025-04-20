const express = require('express');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

// Inicializar app
const app = express();
const PORT = process.env.PORT || 5000; // Usar el puerto 5000 por defecto

// Middleware
// Configuración de CORS - Permitir todas las solicitudes en cualquier entorno
console.log('Permitiendo todas las solicitudes CORS para facilitar el desarrollo');
app.use(cors({
  origin: true, // Permitir solicitudes desde cualquier origen con credenciales
  credentials: true
}));

// Middleware para manejar errores de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor del Sistema de Feedback funcionando correctamente (versión simple)',
    time: new Date().toISOString()
  });
});

// Ruta de estado (no requiere conexión a la base de datos)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'API del Sistema de Feedback funcionando correctamente (versión simple)',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de verificación de salud adicional
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'El servidor está funcionando correctamente (versión simple)',
    time: new Date().toISOString()
  });
});

// Ruta raíz de la API
app.get('/api', (req, res) => {
  res.json({
    message: 'Bienvenido a la API del Sistema de Feedback (versión simple)',
    version: '1.0.0',
    endpoints: [
      '/api/status',
      '/api/health'
    ]
  });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} (versión simple)`);
});

// Configurar manejo de errores del servidor
server.on('error', (error) => {
  console.error('Error en el servidor:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Intenta con otro puerto.`);
    process.exit(1); // Salir con código de error
  }
});

// Configurar manejo de errores no capturados a nivel de aplicación
process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
  // No cerramos el proceso, solo registramos el error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  // No cerramos el proceso, solo registramos el error
});

// Manejar cierre gracioso del servidor
process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor HTTP cerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor HTTP cerrado.');
    process.exit(0);
  });
});
