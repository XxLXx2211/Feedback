/**
 * Servicio de colas para procesamiento asíncrono de PDFs
 * Permite procesar múltiples PDFs en paralelo sin bloquear el servidor
 *
 * En entorno de producción sin Redis, se utiliza una implementación en memoria
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getPDFDocumentModel } = require('../models/PDFDocument');
const { processPDF } = require('./pdfService');
const cacheService = require('./cacheService');

// Determinar si estamos en entorno de producción sin Redis
const isProduction = process.env.NODE_ENV === 'production';
const hasRedis = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost' && process.env.REDIS_HOST !== '127.0.0.1';

// Implementación de cola en memoria para entornos sin Redis
class MemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.handlers = {};
    this.activeJobs = 0;
    this.completedJobs = 0;
    this.failedJobs = 0;
    this.lastJobId = 0;
    this.processorFn = null;
    this.maxConcurrent = 1;
  }

  // Simular eventos de Bull
  on(event, callback) {
    this.handlers[event] = callback;
    return this;
  }

  // Añadir trabajo a la cola
  async add(data, options = {}) {
    const jobId = ++this.lastJobId;
    const job = {
      id: jobId,
      data,
      options,
      progress: (percent) => {
        console.log(`Job ${jobId} progress: ${percent}%`);
        return job;
      },
      timestamp: Date.now()
    };

    this.jobs.push(job);

    // Procesar inmediatamente si hay capacidad
    this._processNext();

    return job;
  }

  // Configurar función de procesamiento
  process(concurrency, processorFn) {
    if (typeof concurrency === 'function') {
      processorFn = concurrency;
      concurrency = 1;
    }

    this.maxConcurrent = concurrency;
    this.processorFn = processorFn;

    // Iniciar procesamiento
    this._processNext();

    return this;
  }

  // Procesar siguiente trabajo
  async _processNext() {
    if (!this.processorFn || this.activeJobs >= this.maxConcurrent || this.jobs.length === 0) {
      return;
    }

    const job = this.jobs.shift();
    this.activeJobs++;

    try {
      await this.processorFn(job);
      this.completedJobs++;

      if (job.options.removeOnComplete) {
        // Simular eliminación del trabajo completado
      }

      if (this.handlers['completed']) {
        this.handlers['completed'](job);
      }
    } catch (error) {
      this.failedJobs++;

      if (this.handlers['failed']) {
        this.handlers['failed'](job, error);
      }

      console.error(`Error en job ${job.id} de cola ${this.name}:`, error);
    } finally {
      this.activeJobs--;
      this._processNext(); // Procesar el siguiente trabajo
    }
  }

  // Métodos para obtener estadísticas
  async getWaitingCount() {
    return this.jobs.length;
  }

  async getActiveCount() {
    return this.activeJobs;
  }

  async getCompletedCount() {
    return this.completedJobs;
  }

  async getFailedCount() {
    return this.failedJobs;
  }

  // Simular pausa/reanudación
  pause() {
    this._paused = true;
    return Promise.resolve();
  }

  resume() {
    this._paused = false;
    this._processNext();
    return Promise.resolve();
  }
}

// Crear colas (usando Bull o la implementación en memoria según el entorno)
let pdfProcessingQueue, pdfAnalysisQueue, pdfCleanupQueue;

if (!isProduction || hasRedis) {
  // Usar Bull con Redis en desarrollo o si hay Redis configurado
  const Queue = require('bull');

  const REDIS_CONFIG = {
    redis: {
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    }
  };

  try {
    pdfProcessingQueue = new Queue('pdf-processing', REDIS_CONFIG);
    pdfAnalysisQueue = new Queue('pdf-analysis', REDIS_CONFIG);
    pdfCleanupQueue = new Queue('pdf-cleanup', REDIS_CONFIG);
    console.log('Usando Bull con Redis para colas de procesamiento');
  } catch (error) {
    console.error('Error al conectar con Redis, usando implementación en memoria:', error.message);
    pdfProcessingQueue = new MemoryQueue('pdf-processing');
    pdfAnalysisQueue = new MemoryQueue('pdf-analysis');
    pdfCleanupQueue = new MemoryQueue('pdf-cleanup');
  }
} else {
  // Usar implementación en memoria en producción sin Redis
  console.log('Usando implementación en memoria para colas de procesamiento');
  pdfProcessingQueue = new MemoryQueue('pdf-processing');
  pdfAnalysisQueue = new MemoryQueue('pdf-analysis');
  pdfCleanupQueue = new MemoryQueue('pdf-cleanup');
}

// Configurar número de procesadores basado en CPUs disponibles
const NUM_WORKERS = Math.max(2, Math.min(os.cpus().length - 1, 8));
console.log(`Configurando ${NUM_WORKERS} workers para procesamiento de PDFs`);

// Monitorear estado del sistema
let systemLoad = {
  cpuUsage: 0,
  memoryUsage: 0,
  isOverloaded: false,
  lastCheck: Date.now()
};

// Verificar carga del sistema cada 30 segundos
setInterval(() => {
  const cpuUsage = os.loadavg()[0]; // Carga promedio de 1 minuto
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsage = 1 - (freeMemory / totalMemory);

  systemLoad = {
    cpuUsage,
    memoryUsage,
    freeMemoryMB: Math.round(freeMemory / (1024 * 1024)),
    isOverloaded: cpuUsage > 0.8 || memoryUsage > 0.85, // 80% CPU o 85% memoria
    lastCheck: Date.now()
  };

  // Si el sistema está sobrecargado, pausar temporalmente las colas
  if (systemLoad.isOverloaded) {
    console.log('Sistema sobrecargado, pausando colas temporalmente');
    pdfProcessingQueue.pause();
    pdfAnalysisQueue.pause();

    // Reanudar después de 30 segundos
    setTimeout(() => {
      pdfProcessingQueue.resume();
      pdfAnalysisQueue.resume();
      console.log('Colas reanudadas después de pausa por sobrecarga');
    }, 30000);
  }
}, 30000);

// Procesar PDFs (extracción básica de texto)
pdfProcessingQueue.process(NUM_WORKERS, async (job) => {
  const { pdfId } = job.data;
  console.log(`Procesando PDF ${pdfId} (Job ${job.id})`);

  try {
    // Obtener modelo y documento
    const PDFDocument = await getPDFDocumentModel();
    const document = await PDFDocument.findById(pdfId);

    if (!document) {
      throw new Error(`Documento no encontrado: ${pdfId}`);
    }

    // Actualizar estado
    document.s = 'p'; // procesando
    await document.save();

    // Procesar el PDF
    job.progress(10);
    const result = await processPDF(document.p, { waitTimeout: 300 });
    job.progress(70);

    if (!result.success) {
      throw new Error(`Error al procesar PDF: ${result.error || 'Error desconocido'}`);
    }

    // Actualizar documento con el texto extraído
    document.tx = result.text || '';
    document.s = 'c'; // completado
    await document.save();
    job.progress(100);

    // Invalidar caché relacionada
    cacheService.invalidatePattern(`pdf_${pdfId}_*`);

    return { success: true, pdfId, textLength: result.text.length };
  } catch (error) {
    console.error(`Error procesando PDF ${pdfId}:`, error);

    try {
      // Marcar como error en la base de datos
      const PDFDocument = await getPDFDocumentModel();
      await PDFDocument.findByIdAndUpdate(pdfId, { s: 'e' }); // error
    } catch (dbError) {
      console.error('Error al actualizar estado en BD:', dbError);
    }

    throw error;
  }
});

// Analizar PDFs (análisis detallado)
pdfAnalysisQueue.process(Math.max(1, NUM_WORKERS / 2), async (job) => {
  const { pdfId } = job.data;
  console.log(`Analizando PDF ${pdfId} (Job ${job.id})`);

  try {
    // Obtener modelo y documento
    const PDFDocument = await getPDFDocumentModel();
    const document = await PDFDocument.findById(pdfId);

    if (!document) {
      throw new Error(`Documento no encontrado: ${pdfId}`);
    }

    // Verificar si ya tiene texto extraído
    if (!document.tx) {
      // Si no tiene texto, primero procesarlo
      await addPDFToProcessingQueue(pdfId);
      throw new Error(`Documento sin texto extraído. Se ha enviado a la cola de procesamiento.`);
    }

    job.progress(20);

    // Realizar análisis detallado
    // Aquí iría la lógica de análisis detallado con LLMWhisperer o similar
    const analysisResult = {
      summary: "Análisis generado por el sistema de colas",
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 5000) + 1000 // Simulación
    };

    job.progress(80);

    // Actualizar documento con el análisis
    document.a = JSON.stringify(analysisResult);
    await document.save();

    job.progress(100);

    // Invalidar caché relacionada
    cacheService.invalidatePattern(`pdf_analysis_${pdfId}`);

    return { success: true, pdfId };
  } catch (error) {
    console.error(`Error analizando PDF ${pdfId}:`, error);
    throw error;
  }
});

// Limpieza periódica de archivos temporales
pdfCleanupQueue.process(async (job) => {
  const { olderThan } = job.data;
  const cutoffDate = new Date(Date.now() - olderThan);
  console.log(`Limpiando archivos temporales más antiguos que ${cutoffDate.toISOString()}`);

  try {
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      return { success: true, message: 'Directorio temporal no existe', filesRemoved: 0 };
    }

    const files = fs.readdirSync(tempDir);
    let filesRemoved = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        filesRemoved++;
      }
    }

    return { success: true, filesRemoved };
  } catch (error) {
    console.error('Error en limpieza de archivos:', error);
    throw error;
  }
});

// Programar limpieza diaria de archivos temporales
try {
  pdfCleanupQueue.add(
    { olderThan: 24 * 60 * 60 * 1000 }, // 24 horas
    {
      repeat: { cron: '0 3 * * *' }, // 3 AM todos los días
      removeOnComplete: true
    }
  );
} catch (error) {
  console.log('Programando limpieza manual para implementación en memoria');
  // Para implementación en memoria, programar limpieza con setInterval
  setInterval(async () => {
    try {
      await pdfCleanupQueue.add({ olderThan: 24 * 60 * 60 * 1000 });
    } catch (error) {
      console.error('Error al programar limpieza:', error);
    }
  }, 24 * 60 * 60 * 1000); // Cada 24 horas
}

// Manejar errores en las colas
[pdfProcessingQueue, pdfAnalysisQueue, pdfCleanupQueue].forEach(queue => {
  queue.on('error', (error) => {
    console.error(`Error en cola ${queue.name}:`, error);
  });

  queue.on('failed', (job, error) => {
    console.error(`Job ${job.id} falló en cola ${queue.name}:`, error);
  });
});

/**
 * Añadir un PDF a la cola de procesamiento
 * @param {string} pdfId - ID del documento PDF
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Información del trabajo
 */
async function addPDFToProcessingQueue(pdfId, options = {}) {
  const job = await pdfProcessingQueue.add(
    { pdfId, options },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false,
      timeout: 300000, // 5 minutos
      ...options
    }
  );

  return {
    jobId: job.id,
    pdfId,
    status: 'queued'
  };
}

/**
 * Añadir un PDF a la cola de análisis
 * @param {string} pdfId - ID del documento PDF
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Información del trabajo
 */
async function addPDFToAnalysisQueue(pdfId, options = {}) {
  const job = await pdfAnalysisQueue.add(
    { pdfId, options },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000
      },
      removeOnComplete: true,
      removeOnFail: false,
      timeout: 600000, // 10 minutos
      ...options
    }
  );

  return {
    jobId: job.id,
    pdfId,
    status: 'queued'
  };
}

/**
 * Obtener estado de las colas
 * @returns {Promise<Object>} - Estado de todas las colas
 */
async function getQueuesStatus() {
  const [
    processingWaiting,
    processingActive,
    processingCompleted,
    processingFailed,
    analysisWaiting,
    analysisActive,
    analysisCompleted,
    analysisFailed
  ] = await Promise.all([
    pdfProcessingQueue.getWaitingCount(),
    pdfProcessingQueue.getActiveCount(),
    pdfProcessingQueue.getCompletedCount(),
    pdfProcessingQueue.getFailedCount(),
    pdfAnalysisQueue.getWaitingCount(),
    pdfAnalysisQueue.getActiveCount(),
    pdfAnalysisQueue.getCompletedCount(),
    pdfAnalysisQueue.getFailedCount()
  ]);

  return {
    system: systemLoad,
    processing: {
      waiting: processingWaiting,
      active: processingActive,
      completed: processingCompleted,
      failed: processingFailed,
      total: processingWaiting + processingActive
    },
    analysis: {
      waiting: analysisWaiting,
      active: analysisActive,
      completed: analysisCompleted,
      failed: analysisFailed,
      total: analysisWaiting + analysisActive
    },
    workers: NUM_WORKERS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  addPDFToProcessingQueue,
  addPDFToAnalysisQueue,
  getQueuesStatus,
  pdfProcessingQueue,
  pdfAnalysisQueue,
  pdfCleanupQueue
};
