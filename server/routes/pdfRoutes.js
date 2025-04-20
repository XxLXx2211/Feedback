const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Controlador (lo crearemos después)
const pdfController = require('../controllers/pdfController');

// Configurar almacenamiento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});

// Filtro para aceptar solo PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

// Configurar multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Rutas
router.post('/upload', upload.single('file'), pdfController.uploadPDF);
router.get('/documents', pdfController.getDocuments);
router.get('/documents/:id', pdfController.getDocument);
router.delete('/documents/:id', pdfController.deleteDocument);
router.post('/analyze/:id', pdfController.analyzePDF);
router.get('/view/:id', pdfController.viewPDF); // Ruta para ver el PDF sin descargar
router.get('/analysis/:id', pdfController.getDocumentAnalysis); // Ruta para obtener el análisis detallado
router.post('/chat/:id', pdfController.chatWithPDF); // Ruta para chatear con el PDF

module.exports = router;
