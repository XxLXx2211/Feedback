/**
 * Rutas para monitoreo del sistema
 */
const express = require('express');
const router = express.Router();
const monitorService = require('../services/monitorService');
const cacheService = require('../services/cacheService');
const { getQueuesStatus } = require('../services/queueService');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Ruta pública para verificar estado básico del sistema
router.get('/status', async (req, res) => {
  try {
    // Incrementar contador de solicitudes
    monitorService.incrementRequests(true);
    
    // Verificar si el sistema está sobrecargado
    const overloadStatus = await monitorService.isSystemOverloaded();
    
    res.json({
      status: 'online',
      message: 'API del Sistema de Feedback funcionando correctamente',
      timestamp: new Date().toISOString(),
      overloaded: overloadStatus.isOverloaded
    });
  } catch (error) {
    console.error('Error al verificar estado:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      status: 'error',
      message: 'Error al verificar estado del sistema',
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta protegida para información detallada del sistema (solo admin)
router.get('/system-info', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    monitorService.incrementRequests(true);
    const systemInfo = await monitorService.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    console.error('Error al obtener información del sistema:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      error: 'Error al obtener información del sistema',
      message: error.message
    });
  }
});

// Ruta para verificar estado de las colas (solo admin)
router.get('/queues', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    monitorService.incrementRequests(true);
    const queuesStatus = await getQueuesStatus();
    res.json(queuesStatus);
  } catch (error) {
    console.error('Error al obtener estado de las colas:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      error: 'Error al obtener estado de las colas',
      message: error.message
    });
  }
});

// Ruta para verificar estado de la caché (solo admin)
router.get('/cache', authMiddleware, adminMiddleware, (req, res) => {
  try {
    monitorService.incrementRequests(true);
    const cacheStats = cacheService.getStats();
    res.json(cacheStats);
  } catch (error) {
    console.error('Error al obtener estadísticas de caché:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas de caché',
      message: error.message
    });
  }
});

// Ruta para limpiar la caché (solo admin)
router.post('/cache/flush', authMiddleware, adminMiddleware, (req, res) => {
  try {
    monitorService.incrementRequests(true);
    cacheService.flush();
    res.json({ 
      success: true,
      message: 'Caché limpiada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      error: 'Error al limpiar caché',
      message: error.message
    });
  }
});

// Ruta para resetear estadísticas (solo admin)
router.post('/reset-stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    monitorService.incrementRequests(true);
    const result = monitorService.resetStats();
    res.json(result);
  } catch (error) {
    console.error('Error al resetear estadísticas:', error);
    monitorService.incrementRequests(false);
    res.status(500).json({ 
      error: 'Error al resetear estadísticas',
      message: error.message
    });
  }
});

module.exports = router;
