// Este script se ejecuta en el navegador para interceptar solicitudes a Railway
(function() {
  console.log('Iniciando interceptor agresivo de solicitudes a Railway');

  // Constante con la URL de Render
  const RENDER_API_URL = 'https://sermalite-feedback-api.onrender.com';

  // Función para reemplazar cualquier URL de Railway con Render
  function replaceRailwayUrl(url) {
    if (typeof url !== 'string') return url;

    // Reemplazar cualquier URL que contenga 'railway'
    if (url.includes('railway')) {
      const newUrl = url.replace(
        /https?:\/\/web-production-d1ba\.up\.railway\.app/g,
        RENDER_API_URL
      );
      console.warn('INTERCEPTOR AGRESIVO: Redirigiendo solicitud de Railway a Render:', {
        original: url,
        redirected: newUrl
      });
      return newUrl;
    }
    return url;
  }

  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const newUrl = replaceRailwayUrl(url);
    return originalFetch(newUrl, options);
  };

  // Interceptar XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const newUrl = replaceRailwayUrl(url);
    return originalXHROpen.call(this, method, newUrl, ...rest);
  };

  // Interceptar cualquier script que intente cargar desde Railway
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);

    if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link' || tagName.toLowerCase() === 'img') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if ((name === 'src' || name === 'href') && typeof value === 'string' && value.includes('railway')) {
          const newValue = replaceRailwayUrl(value);
          return originalSetAttribute.call(this, name, newValue);
        }
        return originalSetAttribute.call(this, name, value);
      };
    }

    return element;
  };

  // Interceptar cualquier cambio en el DOM que intente cargar desde Railway
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes') {
        const element = mutation.target;
        if (element.tagName === 'SCRIPT' || element.tagName === 'LINK' || element.tagName === 'IMG') {
          const attr = mutation.attributeName;
          if (attr === 'src' || attr === 'href') {
            const value = element.getAttribute(attr);
            if (value && value.includes('railway')) {
              const newValue = replaceRailwayUrl(value);
              element.setAttribute(attr, newValue);
            }
          }
        }
      }
    });
  });

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['src', 'href']
  });

  console.log('Interceptor agresivo de solicitudes a Railway activado');
})();
