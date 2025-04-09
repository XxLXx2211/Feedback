const mongoose = require('mongoose');
require('dotenv').config();

// Definir esquemas simplificados para los modelos
const employeeSchema = new mongoose.Schema({
  n: String, // nombre_completo
  c: String, // cedula
  p: String, // puesto
  e: mongoose.Schema.Types.ObjectId, // empresa
  a: Boolean // activo
});

const feedbackLinkSchema = new mongoose.Schema({
  f: mongoose.Schema.Types.ObjectId, // feedback
  t: String, // token
  a: Boolean, // activo
  e: Date, // fecha_expiracion
  o: Boolean // mostrar_observaciones
});

// Registrar los modelos
const Employee = mongoose.model('Employee', employeeSchema);
const FeedbackLink = mongoose.model('FeedbackLink', feedbackLinkSchema);

async function cleanDatabase() {
  try {
    // Conectar a la base de datos
    const MONGODB_URI = process.env.MONGODB_URI;
    console.log(`Conectando a la base de datos: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Conexión exitosa a la base de datos');

    // 1. Buscar y eliminar empleados con cédula nula
    console.log('Buscando empleados con cédula nula...');
    const employeesWithNullCedula = await Employee.find({ c: null });
    console.log(`Se encontraron ${employeesWithNullCedula.length} empleados con cédula nula`);
    
    if (employeesWithNullCedula.length > 0) {
      console.log('Eliminando empleados con cédula nula...');
      const deleteResult = await Employee.deleteMany({ c: null });
      console.log(`Se eliminaron ${deleteResult.deletedCount} empleados con cédula nula`);
    }

    // 2. Buscar y eliminar enlaces de feedback con token nulo
    console.log('Buscando enlaces de feedback con token nulo...');
    const linksWithNullToken = await FeedbackLink.find({ t: null });
    console.log(`Se encontraron ${linksWithNullToken.length} enlaces con token nulo`);
    
    if (linksWithNullToken.length > 0) {
      console.log('Eliminando enlaces con token nulo...');
      const deleteResult = await FeedbackLink.deleteMany({ t: null });
      console.log(`Se eliminaron ${deleteResult.deletedCount} enlaces con token nulo`);
    }

    // 3. Verificar que no queden documentos con valores nulos
    const remainingEmployeesWithNullCedula = await Employee.find({ c: null });
    const remainingLinksWithNullToken = await FeedbackLink.find({ t: null });
    
    console.log(`Empleados con cédula nula restantes: ${remainingEmployeesWithNullCedula.length}`);
    console.log(`Enlaces con token nulo restantes: ${remainingLinksWithNullToken.length}`);

    console.log('Limpieza de la base de datos completada');
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await mongoose.connection.close();
    console.log('Conexión a la base de datos cerrada');
  }
}

// Ejecutar la función de limpieza
cleanDatabase();
