const jwt = require('jsonwebtoken');

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
  // Obtener el token del encabezado de autorización
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // Si no hay token, devolver error
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'feedback_system_secret_key');
    
    // Añadir el usuario decodificado a la solicitud
    req.user = decoded;
    
    // Continuar con la siguiente función de middleware
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};

module.exports = { authenticateToken };
