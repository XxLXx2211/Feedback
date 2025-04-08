const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Función para verificar las variables de entorno
function verificarVariablesEntorno() {
  console.log('=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===');
  
  // Verificar que el archivo .env existe
  const envPath = path.resolve(__dirname, '../.env');
  console.log(`Buscando archivo .env en: ${envPath}`);
  
  if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env encontrado');
    
    // Leer el contenido del archivo .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() !== '');
    
    console.log(`Contenido del archivo .env (${envLines.length} líneas):`);
    envLines.forEach(line => {
      // Ocultar contraseñas y tokens
      const sanitizedLine = line.replace(/(=.*:).*(@)/g, '$1****$2');
      console.log(`  ${sanitizedLine}`);
    });
    
    // Cargar variables de entorno
    dotenv.config({ path: envPath });
    
    // Verificar variables específicas
    const requiredVars = ['PORT', 'PDF_MONGODB_URI'];
    console.log('\nVerificando variables requeridas:');
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        // Ocultar contraseñas y tokens
        const sanitizedValue = varName.includes('URI') || varName.includes('KEY') || varName.includes('SECRET')
          ? value.replace(/(.*:).*(@)/g, '$1****$2')
          : value;
        
        console.log(`✅ ${varName}: ${sanitizedValue}`);
      } else {
        console.log(`❌ ${varName}: No definida`);
      }
    });
    
    // Verificar todas las variables de entorno
    console.log('\nTodas las variables de entorno cargadas:');
    Object.keys(process.env)
      .filter(key => key.toUpperCase() === key) // Solo mostrar variables en mayúsculas (convención)
      .forEach(key => {
        const value = process.env[key];
        // Ocultar contraseñas y tokens
        const sanitizedValue = key.includes('URI') || key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')
          ? (typeof value === 'string' && value.includes('@') ? value.replace(/(.*:).*(@)/g, '$1****$2') : '****')
          : value;
        
        console.log(`  ${key}: ${sanitizedValue}`);
      });
    
  } else {
    console.log('❌ Archivo .env NO encontrado');
  }
}

// Ejecutar la verificación
verificarVariablesEntorno();
