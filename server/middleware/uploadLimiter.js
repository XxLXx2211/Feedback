/**
 * Middleware para limitar la carga de archivos
 * Evita sobrecargas del sistema por múltiples cargas simultáneas
 */

// Almacenamiento en memoria para seguimiento de cargas
const uploadTracker = {
  uploads: {},
  lastCleanup: Date.now()
};

// Configuración de límites
const LIMITS = {
  maxUploadsPerHour: 20,      // Máximo de cargas por hora por IP
  maxUploadsPerMinute: 5,     // Máximo de cargas por minuto por IP
  maxConcurrentUploads: 3,    // Máximo de cargas simultáneas en el sistema
  cleanupInterval: 3600000    // Limpiar registros cada hora (en ms)
};

// Variables globales para seguimiento
let currentUploads = 0;

/**
 * Middleware para limitar cargas de archivos
 */
const uploadLimiter = (req, res, next) => {
  // Limpiar registros antiguos periódicamente
  if (Date.now() - uploadTracker.lastCleanup > LIMITS.cleanupInterval) {
    const oneHourAgo = Date.now() - 3600000;
    Object.keys(uploadTracker.uploads).forEach(ip => {
      uploadTracker.uploads[ip] = uploadTracker.uploads[ip].filter(
        timestamp => timestamp > oneHourAgo
      );
      if (uploadTracker.uploads[ip].length === 0) {
        delete uploadTracker.uploads[ip];
      }
    });
    uploadTracker.lastCleanup = Date.now();
  }

  // Obtener IP del cliente (o un identificador alternativo)
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Inicializar registro para esta IP si no existe
  if (!uploadTracker.uploads[clientIp]) {
    uploadTracker.uploads[clientIp] = [];
  }
  
  // Verificar límite de cargas simultáneas en todo el sistema
  if (currentUploads >= LIMITS.maxConcurrentUploads) {
    return res.status(429).json({
      error: 'Demasiadas cargas simultáneas',
      message: 'El sistema está procesando demasiados archivos. Por favor, intenta de nuevo en unos minutos.',
      retryAfter: 60 // Sugerir reintentar después de 1 minuto
    });
  }
  
  // Verificar límite por hora para esta IP
  const oneHourAgo = Date.now() - 3600000;
  const uploadsLastHour = uploadTracker.uploads[clientIp].filter(
    timestamp => timestamp > oneHourAgo
  ).length;
  
  if (uploadsLastHour >= LIMITS.maxUploadsPerHour) {
    return res.status(429).json({
      error: 'Límite de cargas por hora excedido',
      message: `Has excedido el límite de ${LIMITS.maxUploadsPerHour} cargas por hora. Por favor, intenta más tarde.`,
      retryAfter: 3600 // Sugerir reintentar después de 1 hora
    });
  }
  
  // Verificar límite por minuto para esta IP
  const oneMinuteAgo = Date.now() - 60000;
  const uploadsLastMinute = uploadTracker.uploads[clientIp].filter(
    timestamp => timestamp > oneMinuteAgo
  ).length;
  
  if (uploadsLastMinute >= LIMITS.maxUploadsPerMinute) {
    return res.status(429).json({
      error: 'Límite de cargas por minuto excedido',
      message: `Has excedido el límite de ${LIMITS.maxUploadsPerMinute} cargas por minuto. Por favor, espera un momento.`,
      retryAfter: 60 // Sugerir reintentar después de 1 minuto
    });
  }
  
  // Si pasa todas las verificaciones, registrar esta carga
  uploadTracker.uploads[clientIp].push(Date.now());
  currentUploads++;
  
  // Middleware para reducir el contador cuando finaliza la solicitud
  res.on('finish', () => {
    currentUploads = Math.max(0, currentUploads - 1);
  });
  
  // Continuar con la solicitud
  next();
};

module.exports = uploadLimiter;
