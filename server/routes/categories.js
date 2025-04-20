const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Rutas para categorías
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.get('/:id/questions', categoryController.getQuestionsByCategory);

module.exports = router;
