require('dotenv').config();
const { testConnection } = require('../config/pdfDatabase');

// Función principal
async function main() {
  console.log('Iniciando prueba de conexión a MongoDB Atlas...');
  
  try {
    const result = await testConnection();
    
    if (result) {
      console.log('✅ Prueba completada con éxito. La conexión a MongoDB Atlas funciona correctamente.');
      process.exit(0);
    } else {
      console.error('❌ La prueba falló. No se pudo conectar a MongoDB Atlas.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
main();
