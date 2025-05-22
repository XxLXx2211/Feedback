// Service Worker para interceptar solicitudes a Railway
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(clients.claim());
});

// Interceptar todas las solicitudes fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Verificar si la URL contiene 'railway'
  if (url.hostname.includes('railway') || url.href.includes('railway')) {
    console.log('Service Worker: Interceptando solicitud a Railway:', url.href);
    
    // Crear una nueva URL reemplazando Railway con Render
    const newUrl = url.href.replace(
      /https?:\/\/web-production-d1ba\.up\.railway\.app/g,
      'https://sermalite-feedback-api.onrender.com'
    );
    
    console.log('Service Worker: Redirigiendo a:', newUrl);
    
    // Crear una nueva solicitud con la URL modificada
    const modifiedRequest = new Request(newUrl, {
      method: event.request.method,
      headers: event.request.headers,
      body: event.request.body,
      mode: 'cors',
      credentials: 'include',
      redirect: 'follow'
    });
    
    // Responder con la nueva solicitud
    event.respondWith(fetch(modifiedRequest));
  }
});
