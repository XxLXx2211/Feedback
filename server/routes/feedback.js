const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const feedbackLinkController = require('../controllers/feedbackLinkController');

// Rutas para feedback
router.get('/', feedbackController.getAllFeedbacks);
router.get('/:id', feedbackController.getFeedbackById);
router.post('/', feedbackController.createFeedback);
router.put('/:id', feedbackController.updateFeedback);
router.delete('/:id', feedbackController.deleteFeedback);

// Ruta para obtener un feedback por token
router.get('/token/:token', feedbackController.getFeedbackByToken);

// Ruta para enviar respuestas a un feedback
router.post('/:id/submit', feedbackController.submitAnswers);

// Rutas para enlaces de feedback
router.get('/links', feedbackLinkController.getFeedbackLinks);
router.get('/links/:id', feedbackLinkController.getFeedbackLink);
router.post('/links', feedbackLinkController.createFeedbackLink);
router.put('/links/:id', feedbackLinkController.updateFeedbackLink);
router.delete('/links/:id', feedbackLinkController.deleteFeedbackLink);

module.exports = router;
