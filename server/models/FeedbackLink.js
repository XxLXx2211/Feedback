const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const feedbackLinkSchema = new mongoose.Schema({
  f: { // feedback abreviado
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    required: true
  },
  t: { // token abreviado
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true, // Asegurarse de que el token sea obligatorio
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'El token no puede estar vacío'
    }
  },
  a: { // activo abreviado
    type: Boolean,
    default: true
  },
  e: { // fecha_expiracion abreviada
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
    expires: 60*60*24*31 // TTL de 31 días para limpiar enlaces expirados
  },
  o: { // mostrar_observaciones abreviado
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    createdAt: 'creado',
    updatedAt: false // No necesitamos actualizado para los enlaces
  },
  versionKey: false // Elimina el campo __v
});

module.exports = mongoose.model('FeedbackLink', feedbackLinkSchema);
