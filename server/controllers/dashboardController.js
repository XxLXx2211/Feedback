const Employee = require('../models/Employee');
const Feedback = require('../models/Feedback');
const Company = require('../models/Company');

// Obtener empleados con sus puntuaciones promedio
exports.getEmployeesWithScores = async (req, res) => {
  try {
    // Obtener todos los empleados con información completa de la empresa
    const employees = await Employee.find()
      .populate({
        path: 'e',
        select: 'n',
        model: 'Company'
      })
      .lean();

    // Para cada empleado, obtener sus feedbacks completados
    const employeesWithScores = await Promise.all(
      employees.map(async (employee) => {
        // Buscar todos los feedbacks completados para este empleado
        const feedbacks = await Feedback.find({
          e: employee._id,
          co: true
        }).populate('c', 'n');

        // Calcular puntuación promedio si hay feedbacks
        let puntuacion = 0;
        if (feedbacks.length > 0) {
          const totalScore = feedbacks.reduce((sum, feedback) => sum + feedback.p, 0);
          puntuacion = Math.round(totalScore / feedbacks.length);
        }

        // Obtener la empresa del último feedback si existe
        let empresa = employee.e;

        // Si el empleado no tiene empresa asignada pero tiene feedbacks con empresa, usar esa
        if (!empresa && feedbacks.length > 0) {
          // Buscar el primer feedback que tenga empresa
          const feedbackWithCompany = feedbacks.find(f => f.c);
          if (feedbackWithCompany) {
            empresa = feedbackWithCompany.c;
          }
        }

        // Transformar los datos para mantener compatibilidad con el frontend
        return {
          _id: employee._id,
          nombre_completo: employee.n,
          cedula: employee.c,
          puesto: employee.p,
          empresa: empresa ? { _id: empresa._id, nombre: empresa.n } : null,
          activo: employee.a,
          createdAt: employee.creado,
          updatedAt: employee.actualizado,
          puntuacion
        };
      })
    );

    // Ordenar por puntuación (de mayor a menor)
    employeesWithScores.sort((a, b) => b.puntuacion - a.puntuacion);

    res.status(200).json(employeesWithScores);
  } catch (error) {
    console.error('Error al obtener empleados con puntuaciones:', error);
    res.status(500).json({ error: 'Error al obtener empleados con puntuaciones' });
  }
};

// Obtener estadísticas generales para el dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    // Contar total de empleados
    const totalEmployees = await Employee.countDocuments();

    // Contar total de empresas
    const totalCompanies = await Company.countDocuments();

    // Contar total de feedbacks
    const totalFeedbacks = await Feedback.countDocuments();

    // Contar feedbacks completados
    const completedFeedbacks = await Feedback.countDocuments({ co: true });

    // Calcular puntuación promedio de todos los feedbacks completados
    let averageScore = 0;
    if (completedFeedbacks > 0) {
      const feedbacks = await Feedback.find({ co: true });
      const totalScore = feedbacks.reduce((sum, feedback) => sum + feedback.p, 0);
      averageScore = Math.round(totalScore / completedFeedbacks);
    }

    res.status(200).json({
      totalEmployees,
      totalCompanies,
      totalFeedbacks,
      completedFeedbacks,
      averageScore
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
  }
};
