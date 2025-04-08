const Employee = require('../models/Employee');
const Feedback = require('../models/Feedback');

// Obtener todos los empleados
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('e', 'nombre')
      .sort({ n: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedEmployees = employees.map(emp => ({
      _id: emp._id,
      nombre_completo: emp.n,
      cedula: emp.c,
      puesto: emp.p,
      empresa: emp.e ? { _id: emp.e._id, nombre: emp.e.nombre } : null,
      activo: emp.a,
      createdAt: emp.creado,
      updatedAt: emp.actualizado
    }));

    res.status(200).json(transformedEmployees);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
};

// Obtener un empleado por ID
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('e', 'nombre');

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedEmployee = {
      _id: employee._id,
      nombre_completo: employee.n,
      cedula: employee.c,
      puesto: employee.p,
      empresa: employee.e ? { _id: employee.e._id, nombre: employee.e.nombre } : null,
      activo: employee.a,
      createdAt: employee.creado,
      updatedAt: employee.actualizado
    };

    res.status(200).json(transformedEmployee);
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
};

// Crear un nuevo empleado
exports.createEmployee = async (req, res) => {
  try {
    const { nombre_completo, cedula, puesto, empresa } = req.body;

    if (!nombre_completo || !cedula || !puesto) {
      return res.status(400).json({
        error: 'El nombre, cédula y puesto son obligatorios'
      });
    }

    // Verificar que la cédula no sea una cadena vacía o nula
    if (!cedula || cedula.trim() === '') {
      return res.status(400).json({
        error: 'La cédula no puede estar vacía'
      });
    }

    // Verificar si ya existe un empleado con la misma cédula
    const existingEmployee = await Employee.findOne({ c: cedula });
    if (existingEmployee) {
      return res.status(400).json({
        error: 'Ya existe un empleado con esta cédula'
      });
    }

    // Depurar el problema
    console.log('Datos recibidos:', { nombre_completo, cedula, puesto, empresa });
    console.log('Tipo de cédula:', typeof cedula);
    console.log('Valor de cédula:', cedula);

    // Asegurarse de que la cédula sea una cadena y no esté vacía
    if (!cedula || typeof cedula !== 'string' || cedula.trim() === '') {
      return res.status(400).json({
        error: 'La cédula debe ser una cadena no vacía'
      });
    }

    // Crear empleado con campos optimizados
    const employee = new Employee({
      n: nombre_completo,
      c: cedula.trim(), // Asegurarse de que la cédula no tenga espacios
      p: puesto,
      e: empresa,
      a: true
    });

    console.log('Empleado creado:', employee);

    await employee.save();

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedEmployee = {
      _id: employee._id,
      nombre_completo: employee.n,
      cedula: employee.c,
      puesto: employee.p,
      empresa: employee.e,
      activo: employee.a,
      createdAt: employee.creado,
      updatedAt: employee.actualizado
    };

    res.status(201).json(transformedEmployee);
  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
};

// Actualizar un empleado
exports.updateEmployee = async (req, res) => {
  try {
    const { nombre_completo, cedula, puesto, empresa, activo } = req.body;

    if (!nombre_completo || !puesto) {
      return res.status(400).json({
        error: 'El nombre y puesto son obligatorios'
      });
    }

    // Si se está actualizando la cédula, verificar que no exista otro empleado con esa cédula
    if (cedula) {
      const existingEmployee = await Employee.findOne({
        c: cedula,
        _id: { $ne: req.params.id }
      });

      if (existingEmployee) {
        return res.status(400).json({
          error: 'Ya existe otro empleado con esta cédula'
        });
      }
    }

    // Actualizar empleado con campos optimizados
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        n: nombre_completo,
        c: cedula,
        p: puesto,
        e: empresa,
        a: activo !== undefined ? activo : true
      },
      { new: true, runValidators: true }
    ).populate('e', 'nombre');

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedEmployee = {
      _id: employee._id,
      nombre_completo: employee.n,
      cedula: employee.c,
      puesto: employee.p,
      empresa: employee.e ? { _id: employee.e._id, nombre: employee.e.nombre } : null,
      activo: employee.a,
      createdAt: employee.creado,
      updatedAt: employee.actualizado
    };

    res.status(200).json(transformedEmployee);
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
};

// Eliminar un empleado
exports.deleteEmployee = async (req, res) => {
  try {
    // Verificar si el empleado tiene feedback asociado
    const hasFeedback = await Feedback.exists({ e: req.params.id });

    if (hasFeedback) {
      // En lugar de eliminar, marcar como inactivo
      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        { a: false },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }

      // Transformar los datos para mantener compatibilidad con el frontend
      const transformedEmployee = {
        _id: employee._id,
        nombre_completo: employee.n,
        cedula: employee.c,
        puesto: employee.p,
        empresa: employee.e,
        activo: employee.a,
        createdAt: employee.creado,
        updatedAt: employee.actualizado
      };

      return res.status(200).json({
        message: 'Empleado marcado como inactivo porque tiene feedback asociado',
        employee: transformedEmployee
      });
    }

    // Si no tiene feedback, eliminar completamente
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.status(200).json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
};

// Obtener historial de feedback de un empleado
exports.getEmployeeFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ empleado: req.params.id })
      .populate('empresa', 'nombre')
      .sort({ fecha_creacion: -1 });

    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error al obtener historial de feedback:', error);
    res.status(500).json({ error: 'Error al obtener historial de feedback' });
  }
};
