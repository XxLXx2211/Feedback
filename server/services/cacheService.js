/**
 * Servicio de caché vacío para compatibilidad
 * Este archivo existe solo para evitar errores de referencia
 */

// Funciones vacías para compatibilidad
const get = () => null;
const set = () => true;
const del = () => true;
const flush = () => true;
const getStats = () => ({ keys: 0, uptime: 0 });
const resetStats = () => {};
const getOrSet = async (key, fetchFunction) => await fetchFunction();
const invalidatePattern = () => 0;
const shouldThrottle = () => false;

// Exportar funciones vacías
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
