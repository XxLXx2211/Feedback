const mongoose = require('mongoose');
const { connectPDFDatabase } = require('../config/pdfDatabase');

// Esquema para documentos PDF - Optimizado para menor uso de espacio
const pdfDocumentSchema = new mongoose.Schema({
  // Campos básicos con nombres abreviados
  t: { // título abreviado
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede exceder los 100 caracteres']
  },
  d: { // descripción abreviada
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder los 500 caracteres']
  },
  f: { // nombre del archivo abreviado
    type: String,
    required: [true, 'El nombre del archivo es obligatorio']
  },
  p: { // ruta del archivo abreviada
    type: String,
    required: [true, 'La ruta del archivo es obligatoria']
  },
  s: { // estado abreviado
    type: String,
    enum: ['p', 'c', 'e'], // pendiente, completado (procesado), error - más abreviado
    default: 'p'
  },
  tx: { // texto extraído abreviado
    type: String,
    default: ''
  },
  a: { // análisis abreviado
    type: String,
    default: ''
  },
  g: { // análisis generado por Gemini (abreviado)
    type: String,
    default: ''
  },
  // Contenido del PDF en base64 - Usar Buffer en lugar de String para mejor rendimiento
  pdf: {
    type: Buffer, // Usar Buffer en lugar de String para mejor rendimiento y menor uso de memoria
    required: [true, 'El contenido del PDF es obligatorio']
  },
  // Conversaciones optimizadas
  conv: [{
    m: String, // mensaje
    u: Boolean, // si es del usuario (true) o de la IA (false)
    t: { // timestamp
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: {
    createdAt: 'creado',
    updatedAt: 'actualizado'
  },
  versionKey: false // Elimina el campo __v
});

// Crear modelo con conexión específica para PDFs
let PDFDocument;

// Función para inicializar el modelo con la conexión correcta
const initModel = async () => {
  // Si ya tenemos el modelo inicializado, lo devolvemos
  if (PDFDocument) {
    return PDFDocument;
  }

  try {
    // Conectar a MongoDB Atlas
    const pdfConnection = await connectPDFDatabase();

    // Crear el modelo
    PDFDocument = pdfConnection.model('PDFDocument', pdfDocumentSchema);

    return PDFDocument;
  } catch (error) {
    console.error('Error al inicializar modelo PDFDocument:', error);
    throw error;
  }
};

// No inicializar el modelo automáticamente
// Esto evita que se cree una instancia del modelo antes de que se establezca la conexión
// El modelo se inicializará cuando se llame a initModel() desde el controlador

module.exports = { pdfDocumentSchema, initModel };
