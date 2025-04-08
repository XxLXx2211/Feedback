const mongoose = require('mongoose');

const siNoQuestionSchema = new mongoose.Schema({
  t: { // texto abreviado
    type: String,
    required: [true, 'El texto de la pregunta es obligatorio'],
    trim: true,
    maxlength: [200, 'El texto no puede exceder los 200 caracteres']
  },
  o: { // orden abreviado
    type: Number,
    default: 0
  }
}, { _id: false }); // Elimina el _id de los subdocumentos para ahorrar espacio

const questionSchema = new mongoose.Schema({
  t: { // texto abreviado
    type: String,
    required: [true, 'El texto de la pregunta es obligatorio'],
    trim: true,
    maxlength: [200, 'El texto no puede exceder los 200 caracteres']
  },
  r: { // tipo_respuesta abreviado
    type: String,
    enum: ['e', 's', 't'], // escala, si_no, texto (abreviados)
    default: 'e'
  },
  i: { // importancia abreviada
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  c: { // categoria abreviada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  s: [siNoQuestionSchema], // preguntas_si_no abreviado
  a: { // activo abreviado
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    createdAt: 'creado',
    updatedAt: 'actualizado'
  },
  versionKey: false // Elimina el campo __v
});

module.exports = mongoose.model('Question', questionSchema);
