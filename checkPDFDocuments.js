require('dotenv').config();
const { connectPDFDatabase } = require('./server/config/pdfDatabase');

async function checkPDFDocuments() {
  try {
    console.log('Intentando conectar a la base de datos de PDFs...');
    console.log(`URI: ${process.env.PDF_MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Conectar a MongoDB usando la configuración existente
    const connection = await connectPDFDatabase();

    if (connection && connection.readyState === 1) {
      console.log('Conexión exitosa a la base de datos de PDFs');

      // Verificar si hay colecciones
      const collections = await connection.db.listCollections().toArray();
      console.log('Colecciones disponibles:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });

      // Verificar si hay documentos en la colección PDFDocument
      if (collections.some(collection => collection.name === 'pdfdocuments')) {
        const count = await connection.db.collection('pdfdocuments').countDocuments();
        console.log(`La colección "pdfdocuments" tiene ${count} documentos`);

        if (count > 0) {
          // Mostrar algunos documentos
          const documents = await connection.db.collection('pdfdocuments').find().limit(5).toArray();
          console.log('Primeros documentos:');
          documents.forEach(doc => {
            console.log(`- ID: ${doc._id}, Título: ${doc.t || 'Sin título'}, Estado: ${doc.s || 'Desconocido'}`);
          });
        }
      } else {
        console.log('La colección "pdfdocuments" no existe');
      }
    } else {
      console.log('No se pudo establecer conexión a la base de datos de PDFs');
    }
  } catch (error) {
    console.error('Error al verificar documentos PDF:', error);
  }
}

// Ejecutar la verificación
checkPDFDocuments();
