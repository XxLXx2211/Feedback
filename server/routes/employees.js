const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// Rutas para empleados
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployee);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Ruta para obtener el historial de feedback de un empleado
router.get('/:id/feedback', employeeController.getEmployeeFeedback);

module.exports = router;
