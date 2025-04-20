/**
 * Servicio de caché para optimizar consultas repetitivas
 * Reduce la carga en la base de datos y mejora el rendimiento
 */
const NodeCache = require('node-cache');

// Crear instancia de caché con configuración optimizada
const cache = new NodeCache({
  stdTTL: 300, // Tiempo de vida estándar: 5 minutos
  checkperiod: 60, // Verificar caducidad cada 60 segundos
  useClones: false, // No clonar objetos para mejor rendimiento
  deleteOnExpire: true, // Eliminar automáticamente al expirar
  maxKeys: 1000 // Limitar a 1000 claves para evitar consumo excesivo de memoria
});

// Estadísticas de caché
let cacheStats = {
  hits: 0,
  misses: 0,
  keys: 0,
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
  currentStats.hitRatio = currentStats.hits + currentStats.misses > 0 
    ? (currentStats.hits / (currentStats.hits + currentStats.misses)).toFixed(2) 
    : 0;
  currentStats.keys = cache.keys().length;
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
    lastReset: Date.now()
  };
};

/**
 * Función de ayuda para obtener datos con caché
 * @param {string} key - Clave de caché
 * @param {Function} fetchFunction - Función para obtener datos si no están en caché
 * @param {number} ttl - Tiempo de vida en segundos
 * @returns {Promise<any>} - Datos obtenidos
 */
const getOrSet = async (key, fetchFunction, ttl = 300) => {
  // Intentar obtener de caché primero
  const cachedValue = get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }
  
  // Si no está en caché, obtener datos frescos
  try {
    const freshData = await fetchFunction();
    // Almacenar en caché solo si hay datos válidos
    if (freshData) {
      set(key, freshData, ttl);
    }
    return freshData;
  } catch (error) {
    console.error(`Error al obtener datos para caché (${key}):`, error);
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
  invalidatePattern
};
