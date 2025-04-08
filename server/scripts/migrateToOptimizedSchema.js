require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Definir modelos simulados para la migración
const models = {
  companies: [],
  categories: [],
  employees: [],
  questions: [],
  feedbacks: [],
  feedbacklinks: []
};

// Función para cargar datos de ejemplo
function loadSampleData() {
  console.log('Cargando datos de ejemplo para la migración...');

  // Datos de ejemplo para empresas
  models.companies = [
    { _id: '60d21b4667d0d8992e610c85', nombre: 'Empresa A', direccion: 'Calle Principal 123', createdAt: new Date() },
    { _id: '60d21b4667d0d8992e610c86', nombre: 'Empresa B', ubicacion: 'Avenida Central 456', createdAt: new Date() }
  ];

  // Datos de ejemplo para categorías
  models.categories = [
    { _id: '60d21b4667d0d8992e610c87', nombre: 'Vidrios', descripcion: 'Categoría para preguntas sobre vidrios', activo: true, createdAt: new Date() },
    { _id: '60d21b4667d0d8992e610c88', nombre: 'Limpieza General', descripcion: 'Categoría para preguntas sobre limpieza', activo: true, createdAt: new Date() }
  ];

  // Datos de ejemplo para empleados
  models.employees = [
    { _id: '60d21b4667d0d8992e610c89', nombre_completo: 'Juan Pérez', cedula: '12345678', puesto: 'Operario', empresa: '60d21b4667d0d8992e610c85', activo: true, createdAt: new Date() },
    { _id: '60d21b4667d0d8992e610c8a', nombre_completo: 'María López', cedula: '87654321', puesto: 'Supervisor', empresa: '60d21b4667d0d8992e610c86', activo: true, createdAt: new Date() }
  ];

  // Datos de ejemplo para preguntas
  models.questions = [
    {
      _id: '60d21b4667d0d8992e610c8b',
      texto: '¿Los vidrios están limpios?',
      tipo_respuesta: 'si_no',
      importancia: 4,
      categoria: '60d21b4667d0d8992e610c87',
      activo: true,
      createdAt: new Date()
    },
    {
      _id: '60d21b4667d0d8992e610c8c',
      texto: 'Califica la limpieza general',
      tipo_respuesta: 'escala',
      importancia: 3,
      categoria: '60d21b4667d0d8992e610c88',
      activo: true,
      createdAt: new Date()
    }
  ];

  console.log('Datos de ejemplo cargados correctamente');
}

// Función para migrar los datos
async function migrateData() {
  try {
    console.log('Iniciando proceso de migración sin conexión a MongoDB...');

    // Cargar datos de ejemplo
    loadSampleData();

    console.log('Iniciando migración a esquema optimizado...');

    // Migrar colecciones
    migrateCompanies();
    migrateCategories();
    migrateEmployees();
    migrateQuestions();
    migrateFeedback();
    migrateFeedbackLinks();

    // Guardar los datos optimizados en archivos JSON
    saveOptimizedData();

    console.log('✅ Migración completada con éxito');
    console.log('Los datos optimizados se han guardado en la carpeta "optimized_data"');

  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

// Función para guardar los datos optimizados en archivos JSON
function saveOptimizedData() {
  console.log('Guardando datos optimizados en archivos JSON...');

  // Crear directorio para los datos optimizados si no existe
  const outputDir = path.join(__dirname, '../optimized_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Guardar cada colección en un archivo JSON
  for (const [collection, data] of Object.entries(models)) {
    const filePath = path.join(outputDir, `${collection}_optimized.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  - Colección ${collection} guardada en ${filePath}`);
  }
}

// Función para migrar la colección de empresas
function migrateCompanies() {
  console.log('Migrando colección de empresas...');

  const optimizedCompanies = [];

  for (const company of models.companies) {
    // Crear documento optimizado
    const optimizedCompany = {
      _id: company._id,
      n: company.nombre,
      ubicacion: company.ubicacion || company.direccion || '',
      creado: company.createdAt,
      actualizado: company.updatedAt || company.createdAt
    };

    optimizedCompanies.push(optimizedCompany);
  }

  // Reemplazar los datos originales con los optimizados
  models.companies = optimizedCompanies;

  console.log(`✅ Migradas ${optimizedCompanies.length} empresas`);
}

// Función para migrar la colección de categorías
function migrateCategories() {
  console.log('Migrando colección de categorías...');

  const optimizedCategories = [];

  for (const category of models.categories) {
    // Crear documento optimizado
    const optimizedCategory = {
      _id: category._id,
      n: category.nombre,
      d: category.descripcion || '',
      a: category.activo !== undefined ? category.activo : true,
      creado: category.createdAt,
      actualizado: category.updatedAt || category.createdAt
    };

    optimizedCategories.push(optimizedCategory);
  }

  // Reemplazar los datos originales con los optimizados
  models.categories = optimizedCategories;

  console.log(`✅ Migradas ${optimizedCategories.length} categorías`);
}

// Función para migrar la colección de empleados
function migrateEmployees() {
  console.log('Migrando colección de empleados...');

  const optimizedEmployees = [];

  for (const employee of models.employees) {
    // Crear documento optimizado
    const optimizedEmployee = {
      _id: employee._id,
      n: employee.nombre_completo,
      c: employee.cedula,
      p: employee.puesto,
      e: employee.empresa,
      a: employee.activo !== undefined ? employee.activo : true,
      creado: employee.createdAt,
      actualizado: employee.updatedAt || employee.createdAt
    };

    optimizedEmployees.push(optimizedEmployee);
  }

  // Reemplazar los datos originales con los optimizados
  models.employees = optimizedEmployees;

  console.log(`✅ Migrados ${optimizedEmployees.length} empleados`);
}

// Función para migrar la colección de preguntas
function migrateQuestions() {
  console.log('Migrando colección de preguntas...');

  const optimizedQuestions = [];

  for (const question of models.questions) {
    // Convertir tipo_respuesta al formato abreviado
    const tipoRespuestaAbreviado = question.tipo_respuesta === 'escala' ? 'e' :
                                  question.tipo_respuesta === 'si_no' ? 's' : 't';

    // Convertir preguntas_si_no al formato abreviado
    const preguntasSiNoAbreviadas = question.preguntas_si_no ? question.preguntas_si_no.map(p => ({
      t: p.texto,
      o: p.orden || 0
    })) : [];

    // Crear documento optimizado
    const optimizedQuestion = {
      _id: question._id,
      t: question.texto,
      r: tipoRespuestaAbreviado,
      i: question.importancia,
      c: question.categoria,
      s: tipoRespuestaAbreviado === 's' ? preguntasSiNoAbreviadas : [],
      a: question.activo !== undefined ? question.activo : true,
      creado: question.createdAt,
      actualizado: question.updatedAt || question.createdAt
    };

    optimizedQuestions.push(optimizedQuestion);
  }

  // Reemplazar los datos originales con los optimizados
  models.questions = optimizedQuestions;

  console.log(`✅ Migradas ${optimizedQuestions.length} preguntas`);
}

// Función para migrar la colección de feedback
function migrateFeedback() {
  console.log('Migrando colección de feedback...');

  // Datos de ejemplo para feedbacks
  models.feedbacks = [
    {
      _id: '60d21b4667d0d8992e610c8d',
      titulo: 'Evaluación mensual',
      empleado: '60d21b4667d0d8992e610c89',
      empresa: '60d21b4667d0d8992e610c85',
      respuestas: [
        { pregunta: '60d21b4667d0d8992e610c8b', valor_si_no: true },
        { pregunta: '60d21b4667d0d8992e610c8c', valor_escala: 4 }
      ],
      puntuacion_total: 85,
      completado: true,
      createdAt: new Date()
    }
  ];

  const optimizedFeedbacks = [];

  for (const feedback of models.feedbacks) {
    // Convertir respuestas al formato abreviado
    const respuestasAbreviadas = feedback.respuestas ? feedback.respuestas.map(r => ({
      q: r.pregunta,
      sq: r.subpregunta,
      e: r.valor_escala,
      b: r.valor_si_no,
      tx: r.valor_texto
    })) : [];

    // Crear documento optimizado
    const optimizedFeedback = {
      _id: feedback._id,
      t: feedback.titulo,
      e: feedback.empleado,
      c: feedback.empresa,
      r: respuestasAbreviadas,
      p: feedback.puntuacion_total,
      a: feedback.anonimo !== undefined ? feedback.anonimo : false,
      co: feedback.completado !== undefined ? feedback.completado : false,
      f: feedback.fecha_creacion || feedback.createdAt,
      creado: feedback.createdAt,
      actualizado: feedback.updatedAt || feedback.createdAt
    };

    optimizedFeedbacks.push(optimizedFeedback);
  }

  // Reemplazar los datos originales con los optimizados
  models.feedbacks = optimizedFeedbacks;

  console.log(`✅ Migrados ${optimizedFeedbacks.length} feedbacks`);
}

// Función para migrar la colección de enlaces de feedback
function migrateFeedbackLinks() {
  console.log('Migrando colección de enlaces de feedback...');

  // Datos de ejemplo para enlaces de feedback
  models.feedbacklinks = [
    {
      _id: '60d21b4667d0d8992e610c8e',
      feedback: '60d21b4667d0d8992e610c8d',
      token: 'abc123xyz456',
      activo: true,
      fecha_creacion: new Date(),
      fecha_expiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      mostrar_observaciones: true,
      createdAt: new Date()
    }
  ];

  const optimizedLinks = [];

  for (const link of models.feedbacklinks) {
    // Crear documento optimizado
    const optimizedLink = {
      _id: link._id,
      f: link.feedback,
      t: link.token,
      a: link.activo !== undefined ? link.activo : true,
      e: link.fecha_expiracion || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      o: link.mostrar_observaciones !== undefined ? link.mostrar_observaciones : true,
      creado: link.createdAt
    };

    optimizedLinks.push(optimizedLink);
  }

  // Reemplazar los datos originales con los optimizados
  models.feedbacklinks = optimizedLinks;

  console.log(`✅ Migrados ${optimizedLinks.length} enlaces de feedback`);
}

// Ejecutar la migración
migrateData();
