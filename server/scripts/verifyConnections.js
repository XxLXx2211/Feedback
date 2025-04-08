require('dotenv').config();
const { connectMainDatabase } = require('../config/database');
const { connectPDFDatabase } = require('../config/pdfDatabase');

// Función para verificar ambas conexiones
async function verifyConnections() {
  console.log('Verificando conexiones a bases de datos...');

  // Verificar conexión principal
  console.log('\n=== Verificando conexión a base de datos principal ===');
  try {
    const mainConnected = await connectMainDatabase();
    if (mainConnected) {
      console.log('✅ Conexión a base de datos principal establecida');
    } else {
      console.error('❌ No se pudo conectar a la base de datos principal');
    }
  } catch (error) {
    console.error('❌ Error al verificar conexión principal:', error);
  }

  // Verificar conexión a MongoDB Atlas
  console.log('\n=== Verificando conexión a MongoDB Atlas ===');
  try {
    const pdfConnection = await connectPDFDatabase();
    if (pdfConnection) {
      console.log('✅ Conexión a MongoDB Atlas establecida');

      // Verificar que la conexión está activa
      console.log('Verificando estado de la conexión a MongoDB Atlas...');
      if (pdfConnection.readyState === 1) {
        console.log('Conexión activa (readyState: 1)');
      } else {
        console.log(`Estado de la conexión: ${pdfConnection.readyState}`);
      }

      // Intentar crear una colección de prueba
      try {
        console.log('Creando documento de prueba...');
        const testCollection = pdfConnection.collection('test_connection');
        const result = await testCollection.insertOne({ test: true, date: new Date(), message: 'Prueba de conexión' });
        console.log('Documento creado con éxito:', result.insertedId);

        // Eliminar el documento de prueba
        await testCollection.deleteOne({ _id: result.insertedId });
        console.log('Documento eliminado con éxito');
      } catch (operationError) {
        console.error('Error al realizar operaciones en MongoDB Atlas:', operationError);
      }

      // Cerrar conexión
      await pdfConnection.close();
      console.log('Conexión a MongoDB Atlas cerrada');
    } else {
      console.error('❌ No se pudo conectar a MongoDB Atlas');
    }
  } catch (error) {
    console.error('❌ Error al verificar conexión a MongoDB Atlas:', error);
  }

  console.log('\nVerificación de conexiones completada');
}

// Ejecutar la función principal
verifyConnections()
  .then(() => {
    console.log('Script finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error durante la verificación:', error);
    process.exit(1);
  });
