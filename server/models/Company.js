const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  n: { // nombre abreviado
    type: String,
    required: [true, 'El nombre de la empresa es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
  },
  ubicacion: {
    type: String,
    trim: true,
    maxlength: [100, 'La ubicación no puede exceder los 100 caracteres']
  }
}, {
  timestamps: {
    createdAt: 'creado',
    updatedAt: 'actualizado'
  },
  versionKey: false // Elimina el campo __v
});

module.exports = mongoose.model('Company', companySchema);
