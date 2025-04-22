/**
 * Middleware de autenticación y autorización
 * Controla el acceso a rutas protegidas
 */
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar autenticación
 * Verifica que el token JWT sea válido
 */
const authMiddleware = (req, res, next) => {
  // Para entorno de desarrollo o pruebas, permitir acceso sin autenticación
  if (process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev-user', role: 'admin' };
    return next();
  }

  try {
    // Obtener token del header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Acceso no autorizado',
        message: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key_for_development');
    
    // Añadir información del usuario al request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(401).json({ 
      error: 'Acceso no autorizado',
      message: 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware para verificar rol de administrador
 * Debe usarse después del middleware de autenticación
 */
const adminMiddleware = (req, res, next) => {
  // Para entorno de desarrollo o pruebas, permitir acceso sin verificación
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ 
      error: 'Acceso no autorizado',
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso prohibido',
      message: 'Se requieren privilegios de administrador'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
