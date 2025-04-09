const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const { connectMainDatabase } = require('./config/database');



// Importar middleware
const { checkDatabaseConnection } = require('./middleware/databaseCheck');

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

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurar rutas API con verificación de conexión a la base de datos
app.use('/api/companies', checkDatabaseConnection, companyRoutes);
app.use('/api/employees', checkDatabaseConnection, employeeRoutes);
app.use('/api/questions', checkDatabaseConnection, questionRoutes);
app.use('/api/feedback', checkDatabaseConnection, feedbackRoutes);
app.use('/api/dashboard', checkDatabaseConnection, dashboardRoutes);
app.use('/api/categories', checkDatabaseConnection, categoryRoutes);
app.use('/api/pdf', checkDatabaseConnection, pdfRoutes);

// Configurar conexión a MongoDB
if (process.env.NODE_ENV === 'development') {
  // En modo desarrollo, permitir iniciar el servidor sin conexión a la base de datos
  console.log('Modo desarrollo: Iniciando servidor sin esperar conexión a la base de datos...');

  // Iniciar el servidor inmediatamente en modo desarrollo
  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT} (modo desarrollo)`);
    console.log('NOTA: Las funcionalidades que requieren base de datos podrían no estar disponibles.');
  });

  // Manejar el cierre del servidor
  const closeServer = () => {
    server.close(async () => {
      console.log('Servidor HTTP cerrado.');
      if (mongoose.connection.readyState === 1) {
        try {
          await mongoose.connection.close(false);
          console.log('Conexiones a MongoDB cerradas.');
        } catch (err) {
          console.error('Error al cerrar conexiones a MongoDB:', err);
        }
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', closeServer);
  process.on('SIGTERM', closeServer);

  // Configurar manejo de errores del servidor
  server.on('error', (error) => {
    console.error('Error en el servidor:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PORT} ya está en uso. Intenta con otro puerto.`);
      process.exit(1); // Salir con código de error
    }
  });

  // Intentar conectar a la base de datos en segundo plano con múltiples intentos
  let connectionAttempts = 0;
  const maxConnectionAttempts = 5; // Aumentado a 5 intentos
  const attemptConnection = () => {
    connectionAttempts++;
    console.log(`Intento de conexión a MongoDB Atlas ${connectionAttempts}/${maxConnectionAttempts}...`);

    connectMainDatabase()
      .then(() => {
        console.log('\n=== CONEXIÓN EXITOSA ===');
        console.log('Conexión a la base de datos principal establecida');
        console.log('Todas las funcionalidades están disponibles ahora');
      })
      .catch(err => {
        console.error('\n=== ERROR DE CONEXIÓN ===');
        console.error('Error al conectar a la base de datos principal:', err.message);

        if (connectionAttempts < maxConnectionAttempts) {
          const waitTime = Math.min(connectionAttempts * 3000, 15000); // Espera progresiva: 3s, 6s, 9s, 12s, 15s
          console.log(`Reintentando en ${waitTime/1000} segundos... (Intento ${connectionAttempts}/${maxConnectionAttempts})`);
          setTimeout(attemptConnection, waitTime);
        } else {
          console.warn('ADVERTENCIA: Ejecutando en modo desarrollo sin conexión a la base de datos.');
          console.warn('Las funcionalidades que requieren base de datos no estarán disponibles.');
          console.log('\nPara solucionar este problema:');
          console.log('1. Verifica tu conexión a internet');
          console.log('2. Verifica que las credenciales de MongoDB en el archivo .env sean correctas');
          console.log('3. Verifica que el servidor de MongoDB esté disponible');
          console.log('4. Asegúrate de que tu IP esté en la lista blanca de MongoDB Atlas');

          // Programar un nuevo intento de conexión cada 30 segundos
          console.log('\nSe intentará reconectar automáticamente cada 30 segundos...');
          connectionAttempts = 0; // Reiniciar contador
          setTimeout(attemptConnection, 30000);
        }
      });
  };

  // Iniciar el primer intento de conexión
  attemptConnection();
} else {
  // En producción, la conexión a la base de datos es obligatoria
  console.log('Modo producción: Conectando a la base de datos principal...');
  connectMainDatabase()
    .then(() => {
      console.log('Conexión a la base de datos principal establecida');

      // Iniciar servidor solo si la conexión a la base de datos es exitosa
      const server = app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT} (modo producción)`);
      });

      // Manejar el cierre del servidor
      const closeServer = () => {
        server.close(() => {
          console.log('Servidor HTTP cerrado.');
          if (mongoose.connection.readyState === 1) {
            mongoose.connection.close(false, () => {
              console.log('Conexiones a MongoDB cerradas.');
              process.exit(0);
            });
          } else {
            process.exit(0);
          }
        });
      };

      process.on('SIGINT', closeServer);
      process.on('SIGTERM', closeServer);

      // Configurar manejo de errores del servidor
      server.on('error', (error) => {
        console.error('Error en el servidor:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`El puerto ${PORT} ya está en uso. Intenta con otro puerto.`);
          process.exit(1); // Salir con código de error
        }
      });
    })
    .catch(err => {
      console.error('Error fatal al conectar a la base de datos principal:', err);
      console.error('El servidor no puede iniciarse sin conexión a la base de datos en modo producción');
      process.exit(1); // Salir con código de error
    });
}

// Las rutas API ya están configuradas antes de iniciar el servidor

// Ruta de estado (no requiere conexión a la base de datos)
app.get('/api/status', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  }[dbStatus] || 'unknown';

  res.json({
    status: 'online',
    message: 'API del Sistema de Feedback funcionando correctamente',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      main: dbStatusText,
      readyState: dbStatus,
      development_mode: process.env.NODE_ENV === 'development'
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
process.on('SIGTERM', async () => {
  console.log('Recibida señal SIGTERM. Cerrando servidor...');
  // Cerrar conexiones a la base de datos
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.close(false);
      console.log('Conexiones a MongoDB cerradas.');
    } catch (err) {
      console.error('Error al cerrar conexiones a MongoDB:', err);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recibida señal SIGINT. Cerrando servidor...');
  // Cerrar conexiones a la base de datos
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.close(false);
      console.log('Conexiones a MongoDB cerradas.');
    } catch (err) {
      console.error('Error al cerrar conexiones a MongoDB:', err);
    }
  }
  process.exit(0);
});
