/**
 * Servicio de caché para optimizar consultas repetitivas
 * Reduce la carga en la base de datos y mejora el rendimiento
 */
const NodeCache = require('node-cache');

// Crear instancia de caché con configuración optimizada
const cache = new NodeCache({
  stdTTL: 600, // Tiempo de vida estándar: 10 minutos (aumentado para reducir consultas)
  checkperiod: 120, // Verificar caducidad cada 2 minutos (reducido para mejorar rendimiento)
  useClones: false, // No clonar objetos para mejor rendimiento
  deleteOnExpire: true, // Eliminar automáticamente al expirar
  maxKeys: 2000 // Aumentado a 2000 claves para mejorar hit ratio
});

// Registro de últimas solicitudes para evitar consultas duplicadas
const requestRegistry = {
  timestamps: {},
  minInterval: {} // Intervalo mínimo entre solicitudes para cada clave (en ms)
};

// Estadísticas de caché
let cacheStats = {
  hits: 0,
  misses: 0,
  keys: 0,
  throttled: 0,
  saved: 0, // Consultas ahorradas por throttling
  lastReset: Date.now()
};

/**
 * Obtener un valor de la caché
 * @param {string} key - Clave para buscar en caché
 * @returns {any|null} - Valor almacenado o null si no existe
 */
const get = (key) => {
  const value = cache.get(key);
  if (value !== undefined) {
    cacheStats.hits++;
    return value;
  }
  cacheStats.misses++;
  return null;
};

/**
 * Almacenar un valor en la caché
 * @param {string} key - Clave para almacenar
 * @param {any} value - Valor a almacenar
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 * @returns {boolean} - true si se almacenó correctamente
 */
const set = (key, value, ttl = 300) => {
  cacheStats.keys = cache.keys().length;
  return cache.set(key, value, ttl);
};

/**
 * Eliminar un valor de la caché
 * @param {string} key - Clave a eliminar
 * @returns {number} - Número de elementos eliminados
 */
const del = (key) => {
  const result = cache.del(key);
  cacheStats.keys = cache.keys().length;
  return result;
};

/**
 * Limpiar toda la caché
 * @returns {void}
 */
const flush = () => {
  cache.flushAll();
  cacheStats.keys = 0;
  return true;
};

/**
 * Obtener estadísticas de la caché
 * @returns {Object} - Estadísticas de uso
 */
const getStats = () => {
  const currentStats = { ...cacheStats };
  currentStats.uptime = Math.floor((Date.now() - cacheStats.lastReset) / 1000);

  // Calcular ratios
  const totalRequests = currentStats.hits + currentStats.misses;
  currentStats.hitRatio = totalRequests > 0
    ? (currentStats.hits / totalRequests).toFixed(2)
    : 0;

  // Calcular eficiencia de throttling
  currentStats.throttleRatio = currentStats.throttled > 0
    ? (currentStats.saved / currentStats.throttled).toFixed(2)
    : 0;

  // Calcular ahorro total (hits + throttling)
  currentStats.totalSavings = currentStats.hits + currentStats.saved;
  currentStats.savingsRatio = (totalRequests + currentStats.throttled) > 0
    ? (currentStats.totalSavings / (totalRequests + currentStats.throttled)).toFixed(2)
    : 0;

  // Actualizar contadores
  currentStats.keys = cache.keys().length;
  currentStats.activeThrottles = Object.keys(requestRegistry.timestamps).length;
  currentStats.memoryUsage = process.memoryUsage().heapUsed;

  return currentStats;
};

/**
 * Resetear estadísticas de la caché
 * @returns {void}
 */
const resetStats = () => {
  cacheStats = {
    hits: 0,
    misses: 0,
    keys: cache.keys().length,
    throttled: 0,
    saved: 0,
    lastReset: Date.now()
  };

  // También limpiar el registro de solicitudes para evitar acumulación
  Object.keys(requestRegistry.timestamps).forEach(key => {
    // Mantener solo las solicitudes de los últimos 5 minutos
    if (Date.now() - requestRegistry.timestamps[key] > 300000) {
      delete requestRegistry.timestamps[key];
      delete requestRegistry.minInterval[key];
    }
  });
};

/**
 * Verificar si una solicitud debe ser throttled (limitada)
 * @param {string} key - Clave de la solicitud
 * @param {number} minInterval - Intervalo mínimo entre solicitudes en ms (por defecto 1000ms)
 * @param {boolean} countSaved - Si se debe contar como consulta ahorrada
 * @returns {boolean} - true si debe ser throttled, false si puede proceder
 */
const shouldThrottle = (key, minInterval = 1000, countSaved = true) => {
  const now = Date.now();
  const lastRequest = requestRegistry.timestamps[key] || 0;

  // Guardar el intervalo mínimo para esta clave
  requestRegistry.minInterval[key] = minInterval;

  // Si no ha pasado el tiempo mínimo, throttle la solicitud
  if (now - lastRequest < minInterval) {
    // Incrementar contador de throttling
    cacheStats.throttled = (cacheStats.throttled || 0) + 1;

    // Si hay que contar como consulta ahorrada
    if (countSaved) {
      cacheStats.saved = (cacheStats.saved || 0) + 1;
    }

    return true;
  }

  // Actualizar timestamp
  requestRegistry.timestamps[key] = now;
  return false;
};

/**
 * Función de ayuda para obtener datos con caché y throttling
 * @param {string} key - Clave de caché
 * @param {Function} fetchFunction - Función para obtener datos si no están en caché
 * @param {number} ttl - Tiempo de vida en segundos
 * @param {Object} options - Opciones adicionales
 * @param {number} options.minInterval - Intervalo mínimo entre solicitudes en ms
 * @param {boolean} options.forceRefresh - Forzar actualización ignorando throttling
 * @returns {Promise<any>} - Datos obtenidos
 */
const getOrSet = async (key, fetchFunction, ttl = 600, options = {}) => {
  const { minInterval = 5000, forceRefresh = false } = options;

  // Intentar obtener de caché primero
  const cachedValue = get(key);

  // Si hay valor en caché y no se fuerza actualización, devolverlo
  if (cachedValue !== null && !forceRefresh) {
    return cachedValue;
  }

  // Verificar si debemos throttlear esta solicitud
  if (!forceRefresh && shouldThrottle(`fetch_${key}`, minInterval)) {
    // Si hay valor en caché, devolverlo aunque esté throttled
    if (cachedValue !== null) {
      console.log(`Solicitud throttled para ${key}, usando caché existente`);
      return cachedValue;
    }

    // Si no hay valor en caché, esperar un poco y continuar
    console.log(`Solicitud throttled para ${key}, esperando...`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Si no está en caché o se fuerza actualización, obtener datos frescos
  try {
    console.log(`Obteniendo datos frescos para ${key}`);
    const freshData = await fetchFunction();

    // Almacenar en caché solo si hay datos válidos
    if (freshData) {
      set(key, freshData, ttl);
    }
    return freshData;
  } catch (error) {
    console.error(`Error al obtener datos para caché (${key}):`, error);

    // Si hay error pero tenemos datos en caché, devolver los datos en caché
    if (cachedValue !== null) {
      console.log(`Usando caché existente después de error para ${key}`);
      return cachedValue;
    }

    throw error;
  }
};

/**
 * Invalidar caché por patrón de clave
 * @param {string} pattern - Patrón para invalidar (por ejemplo, 'user_*')
 * @returns {number} - Número de claves invalidadas
 */
const invalidatePattern = (pattern) => {
  const keys = cache.keys();
  const regex = new RegExp(pattern.replace('*', '.*'));
  let count = 0;

  keys.forEach(key => {
    if (regex.test(key)) {
      cache.del(key);
      count++;
    }
  });

  cacheStats.keys = cache.keys().length;
  return count;
};

module.exports = {
  get,
  set,
  del,
  flush,
  getStats,
  resetStats,
  getOrSet,
  invalidatePattern,
  shouldThrottle
};
