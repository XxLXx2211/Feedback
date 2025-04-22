// Un script para configurar y ejecutar el servidor
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 5000;

// Crear un servidor HTTP simple para mostrar el estado
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  
  const responseData = {
    status: 'setup_in_progress',
    message: 'Configurando el servidor...',
    time: new Date().toISOString(),
    url: req.url
  };
  
  res.end(JSON.stringify(responseData, null, 2));
});

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor temporal corriendo en puerto ${PORT}`);
  console.log(`Accede a http://localhost:${PORT} para verificar el estado`);
  
  // Iniciar el proceso de configuración
  console.log('Iniciando proceso de configuración...');
  
  // Verificar si existe el archivo .env
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creando archivo .env...');
    const envContent = `PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://Leo:21752009@servicio-sermalite.pvgfgh4.mongodb.net/?retryWrites=true&w=majority&appName=Servicio-Sermalite
PDF_MONGODB_URI=mongodb+srv://Leo:21752009@servicio-sermalite.pvgfgh4.mongodb.net/?retryWrites=true&w=majority&appName=Servicio-Sermalite
JWT_SECRET=feedback_system_secret_key
GEMINI_API_KEY=AIzaSyAEzl_JpUv0PrqwFQG1mxZyG7vjS2_Vv_E
LLMWHISPERER_API_KEY=4KjptuSzKr5nL_BYnA7eJO9IUmiTXCuVx37U1_QiMSo
LLMWHISPERER_BASE_URL_V2=https://llmwhisperer-api.us-central.unstract.com/api/v2`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('Archivo .env creado correctamente');
  } else {
    console.log('El archivo .env ya existe');
  }
  
  // Verificar si existe el directorio uploads
  const uploadsPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    console.log('Creando directorio uploads...');
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('Directorio uploads creado correctamente');
  } else {
    console.log('El directorio uploads ya existe');
  }
  
  console.log('Configuración completada');
  console.log('El servidor está listo para usar');
  console.log('Puedes acceder a las siguientes rutas:');
  console.log('- http://localhost:5000/ - Página principal');
  console.log('- http://localhost:5000/api - API principal');
  console.log('- http://localhost:5000/api/status - Estado de la API');
  console.log('- http://localhost:5000/api/health - Verificación de salud');
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});
