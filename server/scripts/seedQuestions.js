require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const defaultQuestions = require('../data/defaultQuestions');

// Configurar conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-system';

async function seedQuestions() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Verificar si ya existen preguntas
    const count = await Question.countDocuments();
    
    if (count > 0) {
      console.log(`Ya existen ${count} preguntas en la base de datos.`);
      console.log('Si deseas cargar las preguntas predeterminadas, primero debes eliminar las existentes.');
      process.exit(0);
    }
    
    // Insertar preguntas predeterminadas
    const result = await Question.insertMany(defaultQuestions);
    
    console.log(`Se han insertado ${result.length} preguntas predeterminadas.`);
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    
    process.exit(0);
  } catch (error) {
    console.error('Error al cargar preguntas predeterminadas:', error);
    process.exit(1);
  }
}

// Ejecutar función
seedQuestions();
