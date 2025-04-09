const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Rutas para el dashboard
router.get('/employees-with-scores', dashboardController.getEmployeesWithScores);
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
