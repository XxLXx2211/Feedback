const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Conectar a la base de datos
    const MONGODB_URI = process.env.MONGODB_URI;
    console.log(`Conectando a la base de datos: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('Conexión exitosa a la base de datos');

    // Obtener la conexión a la base de datos
    const db = mongoose.connection.db;

    // 1. Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('Colecciones en la base de datos:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // 2. Listar todos los índices de la colección employees
    console.log('\nÍndices de la colección employees:');
    const employeeIndexes = await db.collection('employees').indexes();
    employeeIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // 3. Listar todos los índices de la colección feedbacklinks
    console.log('\nÍndices de la colección feedbacklinks:');
    const feedbackLinkIndexes = await db.collection('feedbacklinks').indexes();
    feedbackLinkIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // 4. Eliminar el índice cedula_1 de la colección employees
    console.log('\nEliminando índice cedula_1 de la colección employees...');
    try {
      await db.collection('employees').dropIndex('cedula_1');
      console.log('Índice cedula_1 eliminado correctamente');
    } catch (error) {
      console.log('Error al eliminar índice cedula_1:', error.message);
    }

    // 5. Eliminar el índice token_1 de la colección feedbacklinks
    console.log('\nEliminando índice token_1 de la colección feedbacklinks...');
    try {
      await db.collection('feedbacklinks').dropIndex('token_1');
      console.log('Índice token_1 eliminado correctamente');
    } catch (error) {
      console.log('Error al eliminar índice token_1:', error.message);
    }

    // 6. Crear nuevos índices con la opción sparse: true
    console.log('\nEliminando índice c_1 existente en la colección employees...');
    try {
      await db.collection('employees').dropIndex('c_1');
      console.log('Índice c_1 eliminado correctamente');
    } catch (error) {
      console.log('Error al eliminar índice c_1:', error.message);
    }

    console.log('\nCreando nuevo índice c_1 en la colección employees...');
    try {
      await db.collection('employees').createIndex({ c: 1 }, { unique: true, sparse: true, name: 'c_1' });
      console.log('Índice c_1 creado correctamente');
    } catch (error) {
      console.log('Error al crear índice c_1:', error.message);
    }

    console.log('\nCreando nuevo índice t_1 en la colección feedbacklinks...');
    try {
      await db.collection('feedbacklinks').createIndex({ t: 1 }, { unique: true, sparse: true });
      console.log('Índice t_1 creado correctamente');
    } catch (error) {
      console.log('Error al crear índice t_1:', error.message);
    }

    // 7. Corregir índice nombre_1 en la colección categories
    console.log('\nListando índices de la colección categories:');
    const categoryIndexes = await db.collection('categories').indexes();
    categoryIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\nEliminando índice nombre_1 de la colección categories...');
    try {
      await db.collection('categories').dropIndex('nombre_1');
      console.log('Índice nombre_1 eliminado correctamente');
    } catch (error) {
      console.log('Error al eliminar índice nombre_1:', error.message);
    }

    console.log('\nCreando nuevo índice nombre_1 en la colección categories...');
    try {
      await db.collection('categories').createIndex({ nombre: 1 }, { unique: true, sparse: true });
      console.log('Índice nombre_1 creado correctamente');
    } catch (error) {
      console.log('Error al crear índice nombre_1:', error.message);
    }

    // 8. Verificar los nuevos índices
    console.log('\nVerificando nuevos índices de la colección employees:');
    const newEmployeeIndexes = await db.collection('employees').indexes();
    newEmployeeIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}, sparse: ${index.sparse}`);
    });

    console.log('\nVerificando nuevos índices de la colección feedbacklinks:');
    const newFeedbackLinkIndexes = await db.collection('feedbacklinks').indexes();
    newFeedbackLinkIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}, sparse: ${index.sparse}`);
    });

    console.log('\nVerificando nuevos índices de la colección categories:');
    const newCategoryIndexes = await db.collection('categories').indexes();
    newCategoryIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}, sparse: ${index.sparse}`);
    });

    console.log('\nÍndices corregidos correctamente');
  } catch (error) {
    console.error('Error al corregir índices:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await mongoose.connection.close();
    console.log('Conexión a la base de datos cerrada');
  }
}

// Ejecutar la función para corregir los índices
fixIndexes();
