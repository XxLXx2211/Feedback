const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

// Rutas públicas para PDF (sin autenticación)
router.get('/view/:id', pdfController.viewPDF); // Ruta para ver el PDF sin descargar
router.get('/documents/:id', pdfController.getDocument); // Ruta para obtener información del documento

module.exports = router;
