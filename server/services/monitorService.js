/**
 * Servicio de monitoreo del sistema
 * Proporciona información sobre el estado del servidor y recursos
 */
const os = require('os');
const mongoose = require('mongoose');
const { getPDFDocumentModel } = require('../models/PDFDocument');
const cacheService = require('./cacheService');

// Estadísticas del sistema
let systemStats = {
  startTime: Date.now(),
  requestsTotal: 0,
  requestsSuccess: 0,
  requestsError: 0,
  pdfsProcessed: 0,
  pdfsError: 0,
  lastReset: Date.now()
};

// Incrementar contador de solicitudes
function incrementRequests(success = true) {
  systemStats.requestsTotal++;
  if (success) {
    systemStats.requestsSuccess++;
  } else {
    systemStats.requestsError++;
  }
}

// Incrementar contador de PDFs procesados
function incrementPDFsProcessed(success = true) {
  if (success) {
    systemStats.pdfsProcessed++;
  } else {
    systemStats.pdfsError++;
  }
}

// Obtener información del sistema
async function getSystemInfo() {
  try {
    // Usar caché para reducir consultas frecuentes
    return await cacheService.getOrSet('system_info', async () => {
      // Información de recursos del sistema
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = process.memoryUsage();
      
      // Información de MongoDB
      const PDFDocument = await getPDFDocumentModel();
      
      // Contar documentos por estado (usando caché para consultas frecuentes)
      const documentCounts = await cacheService.getOrSet('document_counts', async () => {
        const processing = await PDFDocument.countDocuments({ s: 'p' });
        const completed = await PDFDocument.countDocuments({ s: 'c' });
        const error = await PDFDocument.countDocuments({ s: 'e' });
        const total = await PDFDocument.estimatedDocumentCount();
        
        return { processing, completed, error, total };
      }, 60); // Caché de 60 segundos
      
      // Información de conexiones a MongoDB
      const mongoStats = {
        connections: mongoose.connections.length,
        readyState: mongoose.connection.readyState,
        // Convertir readyState a texto
        status: mongoose.connection.readyState === 0 ? 'desconectado' :
                mongoose.connection.readyState === 1 ? 'conectado' :
                mongoose.connection.readyState === 2 ? 'conectando' :
                mongoose.connection.readyState === 3 ? 'desconectando' : 'desconocido'
      };
      
      // Estadísticas de caché
      const cacheStats = cacheService.getStats();
      
      return {
        system: {
          platform: os.platform(),
          arch: os.arch(),
          cpus: {
            count: cpus.length,
            model: cpus[0].model,
            speed: cpus[0].speed
          },
          memory: {
            total: totalMemory,
            free: freeMemory,
            used: totalMemory - freeMemory,
            usagePercent: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2),
            process: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external
            }
          },
          loadAvg: os.loadavg(),
          uptime: os.uptime()
        },
        application: {
          uptime: Math.floor((Date.now() - systemStats.startTime) / 1000),
          requests: {
            total: systemStats.requestsTotal,
            success: systemStats.requestsSuccess,
            error: systemStats.requestsError,
            successRate: systemStats.requestsTotal > 0 
              ? ((systemStats.requestsSuccess / systemStats.requestsTotal) * 100).toFixed(2) 
              : 100
          },
          pdfs: {
            processed: systemStats.pdfsProcessed,
            error: systemStats.pdfsError,
            successRate: (systemStats.pdfsProcessed + systemStats.pdfsError) > 0 
              ? ((systemStats.pdfsProcessed / (systemStats.pdfsProcessed + systemStats.pdfsError)) * 100).toFixed(2) 
              : 100
          }
        },
        database: {
          mongodb: mongoStats,
          documents: documentCounts
        },
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };
    }, 10); // Caché de 10 segundos para reducir carga
  } catch (error) {
    console.error('Error al obtener información del sistema:', error);
    return {
      error: 'Error al obtener información del sistema',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Verificar si el sistema está sobrecargado
async function isSystemOverloaded() {
  try {
    // Usar caché para reducir consultas frecuentes
    return await cacheService.getOrSet('system_overload_check', async () => {
      // Verificar carga del sistema
      const loadAvg = os.loadavg()[0]; // Carga promedio de 1 minuto
      const cpuCount = os.cpus().length;
      const normalizedLoad = loadAvg / cpuCount;
      
      // Verificar memoria
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = 1 - (freeMemory / totalMemory);
      
      // Verificar documentos en procesamiento
      const PDFDocument = await getPDFDocumentModel();
      const processingCount = await PDFDocument.countDocuments({ s: 'p' });
      
      // Determinar si el sistema está sobrecargado
      const isOverloaded = normalizedLoad > 0.8 || memoryUsage > 0.85 || processingCount > 20;
      
      return {
        isOverloaded,
        factors: {
          cpuOverloaded: normalizedLoad > 0.8,
          memoryOverloaded: memoryUsage > 0.85,
          processingOverloaded: processingCount > 20
        },
        metrics: {
          normalizedLoad,
          memoryUsage: memoryUsage.toFixed(2),
          processingCount
        }
      };
    }, 5); // Caché de 5 segundos
  } catch (error) {
    console.error('Error al verificar sobrecarga del sistema:', error);
    // En caso de error, asumir que no está sobrecargado para evitar bloqueos
    return { isOverloaded: false, error: error.message };
  }
}

// Resetear estadísticas
function resetStats() {
  systemStats = {
    startTime: systemStats.startTime, // Mantener tiempo de inicio
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsError: 0,
    pdfsProcessed: 0,
    pdfsError: 0,
    lastReset: Date.now()
  };
  return { success: true, message: 'Estadísticas reseteadas' };
}

module.exports = {
  getSystemInfo,
  isSystemOverloaded,
  incrementRequests,
  incrementPDFsProcessed,
  resetStats
};
