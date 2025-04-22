// Un servidor HTTP simple sin dependencias externas
const http = require('http');

const PORT = 5000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  
  const responseData = {
    status: 'online',
    message: 'Servidor de prueba funcionando correctamente',
    time: new Date().toISOString(),
    url: req.url
  };
  
  res.end(JSON.stringify(responseData, null, 2));
});

server.listen(PORT, () => {
  console.log(`Servidor de prueba corriendo en puerto ${PORT}`);
  console.log(`Accede a http://localhost:${PORT} para verificar`);
});
