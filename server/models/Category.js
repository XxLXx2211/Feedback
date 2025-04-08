const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  n: { // nombre abreviado
    type: String,
    required: [true, 'El nombre de la categoría es obligatorio'],
    trim: true,
    unique: true,
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  d: { // descripcion abreviada
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede exceder los 200 caracteres']
  },
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

module.exports = mongoose.model('Category', categorySchema);
