// Este script se ejecuta en el navegador para interceptar solicitudes a Railway
(function() {
  // Función para interceptar solicitudes fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // Verificar si la URL contiene 'railway'
    if (typeof url === 'string' && url.includes('railway')) {
      // Reemplazar la URL de Railway con la de Render
      const newUrl = url.replace(
        /https?:\/\/web-production-d1ba\.up\.railway\.app/g, 
        'https://sermalite-feedback-api.onrender.com'
      );
      console.warn('Interceptada solicitud a Railway. Redirigiendo a Render:', {
        original: url,
        redirected: newUrl
      });
      return originalFetch(newUrl, options);
    }
    return originalFetch(url, options);
  };

  // Función para interceptar solicitudes XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    // Verificar si la URL contiene 'railway'
    if (typeof url === 'string' && url.includes('railway')) {
      // Reemplazar la URL de Railway con la de Render
      const newUrl = url.replace(
        /https?:\/\/web-production-d1ba\.up\.railway\.app/g, 
        'https://sermalite-feedback-api.onrender.com'
      );
      console.warn('Interceptada solicitud XHR a Railway. Redirigiendo a Render:', {
        original: url,
        redirected: newUrl
      });
      return originalXHROpen.call(this, method, newUrl, ...rest);
    }
    return originalXHROpen.call(this, method, url, ...rest);
  };

  console.log('Interceptor de solicitudes a Railway activado');
})();
