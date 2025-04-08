const mongoose = require('mongoose');
require('dotenv').config();

// Definir esquema simplificado para el modelo Category
const categorySchema = new mongoose.Schema({
  n: String, // nombre
  d: String, // descripcion
  a: Boolean // activo
});

// Registrar el modelo
const Category = mongoose.model('Category', categorySchema);

async function cleanCategories() {
  try {
    // Conectar a la base de datos
    const MONGODB_URI = process.env.MONGODB_URI;
    console.log(`Conectando a la base de datos: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Conexión exitosa a la base de datos');

    // Obtener la conexión a la base de datos
    const db = mongoose.connection.db;

    // 1. Buscar y eliminar categorías con nombre nulo
    console.log('Buscando categorías con nombre nulo...');
    const categoriesWithNullName = await Category.find({ n: null });
    console.log(`Se encontraron ${categoriesWithNullName.length} categorías con nombre nulo`);
    
    if (categoriesWithNullName.length > 0) {
      console.log('Eliminando categorías con nombre nulo...');
      const deleteResult = await Category.deleteMany({ n: null });
      console.log(`Se eliminaron ${deleteResult.deletedCount} categorías con nombre nulo`);
    }

    // 2. Buscar y eliminar categorías con nombre vacío
    console.log('Buscando categorías con nombre vacío...');
    const categoriesWithEmptyName = await Category.find({ n: '' });
    console.log(`Se encontraron ${categoriesWithEmptyName.length} categorías con nombre vacío`);
    
    if (categoriesWithEmptyName.length > 0) {
      console.log('Eliminando categorías con nombre vacío...');
      const deleteResult = await Category.deleteMany({ n: '' });
      console.log(`Se eliminaron ${deleteResult.deletedCount} categorías con nombre vacío`);
    }

    // 3. Verificar que no queden categorías con nombre nulo o vacío
    const remainingCategoriesWithNullName = await Category.find({ n: null });
    const remainingCategoriesWithEmptyName = await Category.find({ n: '' });
    
    console.log(`Categorías con nombre nulo restantes: ${remainingCategoriesWithNullName.length}`);
    console.log(`Categorías con nombre vacío restantes: ${remainingCategoriesWithEmptyName.length}`);

    // 4. Eliminar el índice nombre_1 de la colección categories
    console.log('Eliminando índice nombre_1 de la colección categories...');
    try {
      await db.collection('categories').dropIndex('nombre_1');
      console.log('Índice nombre_1 eliminado correctamente');
    } catch (error) {
      console.log('Error al eliminar índice nombre_1:', error.message);
    }

    // 5. Crear nuevo índice n_1 en la colección categories
    console.log('Creando nuevo índice n_1 en la colección categories...');
    try {
      await db.collection('categories').createIndex({ n: 1 }, { unique: true, sparse: true });
      console.log('Índice n_1 creado correctamente');
    } catch (error) {
      console.log('Error al crear índice n_1:', error.message);
    }

    // 6. Verificar los nuevos índices
    console.log('Verificando nuevos índices de la colección categories:');
    const newCategoryIndexes = await db.collection('categories').indexes();
    newCategoryIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}, sparse: ${index.sparse}`);
    });

    console.log('Limpieza de categorías completada');
  } catch (error) {
    console.error('Error al limpiar categorías:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await mongoose.connection.close();
    console.log('Conexión a la base de datos cerrada');
  }
}

// Ejecutar la función de limpieza
cleanCategories();
