const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  q: { // pregunta abreviada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  sq: { // subpregunta abreviada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question.s'
  },
  e: { // valor_escala abreviado
    type: Number,
    min: 1,
    max: 5
  },
  b: { // valor_si_no (boolean) abreviado
    type: Boolean
  },
  tx: { // valor_texto abreviado
    type: String,
    trim: true,
    maxlength: [500, 'El texto no puede exceder los 500 caracteres']
  }
}, { _id: false }); // Elimina el _id de los subdocumentos para ahorrar espacio

const feedbackSchema = new mongoose.Schema({
  t: { // titulo abreviado
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede exceder los 100 caracteres']
  },
  e: { // empleado abreviado
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  c: { // empresa abreviada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  r: [answerSchema], // respuestas abreviado
  p: { // puntuacion_total abreviada
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  a: { // anonimo abreviado
    type: Boolean,
    default: false
  },
  co: { // completado abreviado
    type: Boolean,
    default: false
  },
  f: { // fecha_creacion abreviada
    type: Date,
    default: Date.now,
    expires: 60*60*24*365 // TTL de 1 año para limpiar datos antiguos
  }
}, {
  timestamps: {
    createdAt: 'creado',
    updatedAt: 'actualizado'
  },
  versionKey: false // Elimina el campo __v
});

module.exports = mongoose.model('Feedback', feedbackSchema);
