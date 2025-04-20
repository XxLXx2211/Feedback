const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  n: { // nombre_completo abreviado
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
  },
  c: { // cedula abreviada
    type: String,
    required: [true, 'La cédula es obligatoria'],
    unique: true,
    trim: true,
    maxlength: [20, 'La cédula no puede exceder los 20 caracteres'],
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'La cédula no puede estar vacía'
    },
    index: true, // Asegurarse de que se cree un índice
    sparse: true // Permitir que solo los documentos con este campo definido sean indexados
  },
  p: { // puesto abreviado
    type: String,
    required: [true, 'El puesto es obligatorio'],
    trim: true,
    maxlength: [50, 'El puesto no puede exceder los 50 caracteres']
  },
  e: { // empresa abreviada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
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

// Método para limpiar la cédula (eliminar caracteres no numéricos)
employeeSchema.pre('save', function(next) {
  if (this.isModified('c')) {
    if (!this.c || this.c.trim() === '') {
      return next(new Error('La cédula no puede estar vacía'));
    }
    this.c = this.c.replace(/\D/g, '');

    // Asegurarse de que la cédula no sea una cadena vacía después de limpiarla
    if (this.c === '') {
      return next(new Error('La cédula no puede estar vacía después de limpiarla'));
    }
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
