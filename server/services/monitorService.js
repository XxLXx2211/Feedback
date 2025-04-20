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
    // Usar caché para reducir consultas frecuentes con throttling agresivo
    return await cacheService.getOrSet('system_info', async () => {
      // Información de recursos del sistema
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = process.memoryUsage();

      // Información de MongoDB
      let documentCounts = { processing: 0, completed: 0, error: 0, total: 0 };

      try {
        // Contar documentos por estado (usando caché para consultas frecuentes)
        // Aumentar TTL a 120 segundos y usar throttling agresivo (15 segundos mínimo entre consultas)
        documentCounts = await cacheService.getOrSet('document_counts', async () => {
          try {
            // Verificar si debemos throttlear esta consulta (muy costosa)
            if (cacheService.shouldThrottle('db_document_counts', 15000)) {
              console.log('Consulta de conteo de documentos throttled, usando valores en caché o predeterminados');
              // Devolver valores predeterminados o los últimos conocidos
              const lastCounts = cacheService.get('last_document_counts');
              return lastCounts || { processing: 0, completed: 0, error: 0, total: 0 };
            }

            console.log('Realizando consulta de conteo de documentos a la base de datos');
            const PDFDocument = await getPDFDocumentModel();

            // Usar una sola consulta de agregación para obtener todos los conteos
            // Esto es mucho más eficiente que hacer múltiples consultas
            const aggregationResult = await PDFDocument.aggregate([
              {
                $group: {
                  _id: '$s', // Agrupar por estado
                  count: { $sum: 1 } // Contar documentos
                }
              }
            ]);

            // Procesar resultados
            const counts = { processing: 0, completed: 0, error: 0, total: 0 };
            aggregationResult.forEach(result => {
              if (result._id === 'p') counts.processing = result.count;
              else if (result._id === 'c') counts.completed = result.count;
              else if (result._id === 'e') counts.error = result.count;
            });

            // Calcular total
            counts.total = counts.processing + counts.completed + counts.error;

            // Guardar como últimos valores conocidos
            cacheService.set('last_document_counts', counts, 300); // 5 minutos

            return counts;
          } catch (dbError) {
            console.error('Error al obtener conteo de documentos:', dbError);
            // Intentar usar los últimos valores conocidos
            const lastCounts = cacheService.get('last_document_counts');
            return lastCounts || { processing: 0, completed: 0, error: 0, total: 0 };
          }
        }, 120, { minInterval: 15000 }); // Caché de 120 segundos, mínimo 15 segundos entre consultas
      } catch (cacheError) {
        console.error('Error al usar caché para conteo de documentos:', cacheError);
        // Continuar con valores predeterminados o últimos conocidos
        const lastCounts = cacheService.get('last_document_counts');
        documentCounts = lastCounts || { processing: 0, completed: 0, error: 0, total: 0 };
      }

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
    // Usar caché para reducir consultas frecuentes con throttling agresivo
    return await cacheService.getOrSet('system_overload_check', async () => {
      // Verificar carga del sistema
      const loadAvg = os.loadavg()[0]; // Carga promedio de 1 minuto
      const cpuCount = os.cpus().length;
      const normalizedLoad = loadAvg / cpuCount;

      // Verificar memoria
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = 1 - (freeMemory / totalMemory);

      // Verificar documentos en procesamiento - usar caché existente para evitar consultas adicionales
      let processingCount = 0;
      try {
        // Intentar obtener el conteo desde la caché de document_counts
        const cachedCounts = cacheService.get('document_counts') || cacheService.get('last_document_counts');
        if (cachedCounts && typeof cachedCounts.processing === 'number') {
          processingCount = cachedCounts.processing;
          console.log('Usando conteo en caché para verificación de sobrecarga:', processingCount);
        } else {
          // Si no está en caché, verificar si debemos throttlear
          if (cacheService.shouldThrottle('overload_processing_check', 10000)) {
            console.log('Consulta de sobrecarga throttled, usando valor predeterminado');
            // Usar un valor conservador
            processingCount = 5;
          } else {
            // Realizar la consulta a la base de datos
            console.log('Realizando consulta de conteo para verificación de sobrecarga');
            const PDFDocument = await getPDFDocumentModel();
            processingCount = await PDFDocument.countDocuments({ s: 'p' });
          }
        }
      } catch (dbError) {
        console.error('Error al obtener documentos en procesamiento:', dbError);
        // Continuar con processingCount = 0
      }

      // Determinar si el sistema está sobrecargado
      // Ajustar umbrales para ser más conservadores
      const isOverloaded = normalizedLoad > 0.7 || memoryUsage > 0.8 || processingCount > 15;

      const result = {
        isOverloaded,
        factors: {
          cpuOverloaded: normalizedLoad > 0.7,
          memoryOverloaded: memoryUsage > 0.8,
          processingOverloaded: processingCount > 15
        },
        metrics: {
          normalizedLoad,
          memoryUsage: memoryUsage.toFixed(2),
          processingCount
        }
      };

      // Guardar el resultado para referencia futura
      cacheService.set('last_overload_check', result, 300); // 5 minutos

      return result;
    }, 10, { minInterval: 5000 }); // Caché de 10 segundos, mínimo 5 segundos entre consultas
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
