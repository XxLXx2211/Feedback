const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const { connectMainDatabase } = require('./config/database');



// Importar rutas
const companyRoutes = require('./routes/companies');
const employeeRoutes = require('./routes/employees');
const questionRoutes = require('./routes/questions');
const feedbackRoutes = require('./routes/feedback');
const dashboardRoutes = require('./routes/dashboard');
const categoryRoutes = require('./routes/categories');
const pdfRoutes = require('./routes/pdfRoutes');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://pdfeedback-client.onrender.com', 'https://evaluacion-semestral-client.onrender.com', 'https://evaluacion-semestral.onrender.com', 'https://pdfeedback-api.onrender.com', 'https://evaluacion-semestral-api.onrender.com']
    : 'http://localhost:3000',
  credentials: true
}));

// Imprimir configuración de CORS para depuración
console.log('CORS configurado para:', process.env.NODE_ENV === 'production'
  ? ['https://pdfeedback-client.onrender.com', 'https://evaluacion-semestral-client.onrender.com', 'https://evaluacion-semestral.onrender.com']
  : 'http://localhost:3000');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurar conexión a MongoDB - OBLIGATORIA
connectMainDatabase()
  .then(() => {
    console.log('Conexión a la base de datos principal establecida');

    // Iniciar servidor solo si la conexión a la base de datos es exitosa
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error fatal al conectar a la base de datos principal:', err);
    console.error('El servidor no puede iniciarse sin conexión a la base de datos');
    process.exit(1); // Salir con código de error
  });

// Rutas API
app.use('/api/companies', companyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/pdf', pdfRoutes);

// Ruta de prueba
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'API del Sistema de Feedback funcionando correctamente',
    time: new Date().toISOString(),
    mongodb: {
      main: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Ruta para verificar la conexión a MongoDB Atlas
app.get('/api/check-mongodb-atlas', async (req, res) => {
  try {
    const { connectPDFDatabase } = require('./config/pdfDatabase');
    const connection = await connectPDFDatabase();

    if (connection) {
      res.json({
        status: 'connected',
        readyState: connection.readyState,
        message: 'Conexión a MongoDB Atlas establecida'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'No se pudo establecer conexión con MongoDB Atlas'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al verificar conexión a MongoDB Atlas',
      error: error.message
    });
  }
});

// En producción, no servimos archivos estáticos desde el backend
// ya que el frontend se despliega como un sitio estático separado en Render
if (process.env.NODE_ENV === 'production') {
  console.log('Configuración para producción activada - API modo solo backend');

  // Ruta de fallback para endpoints de API no encontrados
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
}

// El servidor se inicia después de conectar a la base de datos
// Ver la sección de configuración de conexión a MongoDB
