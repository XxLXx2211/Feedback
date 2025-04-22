// Un servidor HTTP simple para servir el cliente
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sistema de Feedback</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
        }
        .status {
          margin-top: 20px;
          padding: 15px;
          background-color: #e8f5e9;
          border-radius: 4px;
        }
        .api-status {
          margin-top: 20px;
          padding: 15px;
          background-color: #e3f2fd;
          border-radius: 4px;
        }
        button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 15px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sistema de Feedback</h1>
        <p>Bienvenido al Sistema de Feedback. Esta es una versión simplificada del cliente.</p>
        
        <div class="status">
          <h2>Estado del Cliente</h2>
          <p>El cliente está funcionando correctamente en el puerto ${PORT}.</p>
        </div>
        
        <div class="api-status">
          <h2>Estado de la API</h2>
          <p id="api-status">Verificando conexión con la API...</p>
          <button id="check-api">Verificar API</button>
        </div>
      </div>
      
      <script>
        document.getElementById('check-api').addEventListener('click', async () => {
          try {
            const response = await fetch('http://localhost:5000/api/status');
            const data = await response.json();
            document.getElementById('api-status').innerHTML = 
              '<strong>Conexión exitosa:</strong><br>' + 
              'Estado: ' + data.status + '<br>' +
              'Mensaje: ' + data.message + '<br>' +
              'Tiempo: ' + data.time;
          } catch (error) {
            document.getElementById('api-status').innerHTML = 
              '<strong>Error de conexión:</strong><br>' + error.message;
          }
        });
        
        // Verificar automáticamente al cargar
        window.onload = () => {
          document.getElementById('check-api').click();
        };
      </script>
    </body>
    </html>
    `;
    
    res.end(htmlContent);
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('Página no encontrada');
  }
});

server.listen(PORT, () => {
  console.log(`Cliente simplificado corriendo en puerto ${PORT}`);
  console.log(`Accede a http://localhost:${PORT} para ver el cliente`);
});
