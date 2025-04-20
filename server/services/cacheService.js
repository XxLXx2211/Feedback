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

// Registro de accesos recientes para evitar logs repetitivos
const recentAccesses = {};
const LOG_THROTTLE_MS = 5000; // 5 segundos entre logs para la misma clave

/**
 * Obtener un valor de la caché
 * @param {string} key - Clave para buscar en caché
 * @param {boolean} silent - Si es true, no muestra mensajes de log
 * @param {boolean} noRefreshFlag - Si es true, no añade el flag _fromCache
 * @returns {any|null} - Valor almacenado o null si no existe
 */
const get = (key, silent = false, noRefreshFlag = false) => {
  const value = cache.get(key);
  if (value !== undefined) {
    cacheStats.hits++;

    // Controlar logs repetitivos
    const now = Date.now();
    const lastLog = recentAccesses[key] || 0;

    if (!silent && (now - lastLog > LOG_THROTTLE_MS)) {
      // Limitar los logs para evitar spam en la consola
      if (key.includes('page') && recentAccesses[key]) {
        // No mostrar logs repetitivos para páginas
      } else {
        console.log(`Usando valor en caché para: ${key}`);
      }
      recentAccesses[key] = now;
    }

    // Añadir timestamp para saber cuándo se obtuvo de caché
    if (!noRefreshFlag && typeof value === 'object' && value !== null) {
      // Crear una copia para no modificar el objeto en caché
      const result = { ...value };
      // Añadir flag solo si no existe ya
      if (!result._fromCache) {
        result._fromCache = true;
        result._cachedAt = now;
        result._cacheAge = Math.round((now - (result._timestamp || now)) / 1000);
      }
      return result;
    }

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
 * @param {boolean} options.backgroundRefresh - Actualizar en segundo plano sin bloquear respuesta
 * @returns {Promise<any>} - Datos obtenidos
 */
const getOrSet = async (key, fetchFunction, ttl = 600, options = {}) => {
  const {
    minInterval = 5000,
    forceRefresh = false,
    backgroundRefresh = false,
    maxAge = 60000 // 1 minuto por defecto
  } = options;

  // Intentar obtener de caché primero
  const cachedValue = get(key, false, true); // No añadir flag _fromCache aún
  const now = Date.now();

  // Verificar si el valor en caché es demasiado viejo
  const isCacheStale = cachedValue && cachedValue._timestamp &&
                      (now - cachedValue._timestamp > maxAge);

  // Si hay valor en caché y no está obsoleto y no se fuerza actualización
  if (cachedValue !== null && !forceRefresh && !isCacheStale) {
    // Añadir flag _fromCache manualmente
    if (typeof cachedValue === 'object' && cachedValue !== null) {
      cachedValue._fromCache = true;
      cachedValue._cachedAt = now;
      cachedValue._cacheAge = Math.round((now - (cachedValue._timestamp || now)) / 1000);
    }
    return cachedValue;
  }

  // Si hay valor en caché pero está obsoleto, actualizar en segundo plano
  if (cachedValue !== null && isCacheStale && backgroundRefresh) {
    // Devolver el valor en caché inmediatamente
    const result = { ...cachedValue };
    result._fromCache = true;
    result._cachedAt = now;
    result._cacheAge = Math.round((now - (result._timestamp || now)) / 1000);
    result._refreshing = true;

    // Actualizar en segundo plano
    setTimeout(async () => {
      try {
        console.log(`Actualizando datos en segundo plano para ${key}`);
        const freshData = await fetchFunction();
        if (freshData) {
          freshData._timestamp = Date.now();
          set(key, freshData, ttl);
          set(`last_valid_${key}`, freshData, 86400); // 24 horas
        }
      } catch (bgError) {
        console.error(`Error en actualización en segundo plano para ${key}:`, bgError);
      }
    }, 100);

    return result;
  }

  // Verificar si debemos throttlear esta solicitud
  if (!forceRefresh && shouldThrottle(`fetch_${key}`, minInterval)) {
    // Si hay valor en caché, devolverlo aunque esté throttled
    if (cachedValue !== null) {
      console.log(`Solicitud throttled para ${key}, usando caché existente`);
      const result = { ...cachedValue };
      result._fromCache = true;
      result._cachedAt = now;
      result._cacheAge = Math.round((now - (result._timestamp || now)) / 1000);
      result._throttled = true;
      return result;
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
      // Añadir timestamp para saber cuándo se obtuvo
      if (typeof freshData === 'object' && freshData !== null) {
        freshData._timestamp = Date.now();
      }
      set(key, freshData, ttl);
      // Guardar una copia como último valor conocido válido
      set(`last_valid_${key}`, freshData, 86400); // 24 horas
    }
    return freshData;
  } catch (error) {
    console.error(`Error al obtener datos para caché (${key}):`, error);

    // Estrategia de fallback en cascada:
    // 1. Intentar usar el valor en caché actual si existe
    if (cachedValue !== null) {
      console.log(`Usando caché existente después de error para ${key}`);
      const result = { ...cachedValue };
      result._fromCache = true;
      result._cachedAt = now;
      result._cacheAge = Math.round((now - (result._timestamp || now)) / 1000);
      result._error = true;
      return result;
    }

    // 2. Intentar usar el último valor válido conocido
    const lastValidValue = get(`last_valid_${key}`, true, true);
    if (lastValidValue !== null) {
      console.log(`Usando último valor válido conocido para ${key}`);
      const result = { ...lastValidValue };
      result._fromCache = true;
      result._cachedAt = now;
      result._cacheAge = Math.round((now - (result._timestamp || now)) / 1000);
      result._fallback = true;
      return result;
    }

    // 3. Si es un error de MongoDB relacionado con operadores $, intentar con una consulta más simple
    if (error.name === 'MongoServerError' &&
        (error.message.includes('field names may not start with') ||
         error.message.includes('$'))) {
      console.log(`Error de sintaxis MongoDB detectado para ${key}, intentando consulta simplificada`);

      // Registrar este error para evitar reintentos frecuentes
      set(`error_${key}`, { timestamp: Date.now(), message: error.message }, 300); // 5 minutos

      // Devolver un objeto vacío o array vacío dependiendo del contexto
      if (key.includes('document') || key.includes('pdf')) {
        return {
          documents: [],
          pagination: { totalDocuments: 0, totalPages: 1, currentPage: 1, pageSize: 20 },
          _error: true,
          _errorType: 'mongodb',
          _timestamp: now
        };
      }

      return Array.isArray(cachedValue) ? [] : { _error: true, _timestamp: now };
    }

    // 4. Si todo lo demás falla, lanzar el error
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
