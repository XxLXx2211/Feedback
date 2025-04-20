const Company = require('../models/Company');
const Feedback = require('../models/Feedback');

// Obtener todas las empresas
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ n: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCompanies = companies.map(company => ({
      _id: company._id,
      nombre: company.n,
      ubicacion: company.ubicacion,
      createdAt: company.creado,
      updatedAt: company.actualizado
    }));

    res.status(200).json(transformedCompanies);
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
};

// Obtener una empresa por ID
exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCompany = {
      _id: company._id,
      nombre: company.n,
      ubicacion: company.ubicacion,
      createdAt: company.creado,
      updatedAt: company.actualizado
    };

    res.status(200).json(transformedCompany);
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
};

// Crear una nueva empresa
exports.createCompany = async (req, res) => {
  try {
    const { nombre, ubicacion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    }

    // Crear empresa con campos optimizados
    const company = new Company({
      n: nombre,
      ubicacion
    });

    await company.save();

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCompany = {
      _id: company._id,
      nombre: company.n,
      ubicacion: company.ubicacion,
      createdAt: company.creado,
      updatedAt: company.actualizado
    };

    res.status(201).json(transformedCompany);
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
};

// Actualizar una empresa
exports.updateCompany = async (req, res) => {
  try {
    const { nombre, ubicacion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    }

    // Actualizar empresa con campos optimizados
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { n: nombre, ubicacion },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCompany = {
      _id: company._id,
      nombre: company.n,
      ubicacion: company.ubicacion,
      createdAt: company.creado,
      updatedAt: company.actualizado
    };

    res.status(200).json(transformedCompany);
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
};

// Eliminar una empresa
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.status(200).json({ message: 'Empresa eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
};

// Obtener historial de feedback de una empresa
exports.getCompanyFeedback = async (req, res) => {
  try {
    console.log('Buscando feedbacks para la empresa ID:', req.params.id);

    // Verificar si la empresa existe
    const company = await Company.findById(req.params.id);
    console.log('Empresa encontrada:', company ? 'Sí' : 'No');

    // Buscar todos los feedbacks para depuración
    const allFeedbacks = await Feedback.find().limit(10);
    console.log('Total de feedbacks en la base de datos:', allFeedbacks.length);
    if (allFeedbacks.length > 0) {
      console.log('Ejemplo de un feedback:', {
        _id: allFeedbacks[0]._id,
        titulo: allFeedbacks[0].t,
        empleado_id: allFeedbacks[0].e,
        empresa_id: allFeedbacks[0].c,
        fecha: allFeedbacks[0].f
      });
    }

    // Buscar feedbacks usando el campo abreviado 'c' para empresa
    // También buscar por el campo 'empresa' para compatibilidad con datos antiguos
    const feedbacks = await Feedback.find({ $or: [{ c: req.params.id }, { empresa: req.params.id }] })
      .populate('e', 'n p') // e = empleado, n = nombre, p = puesto
      .sort({ f: -1 }); // f = fecha_creacion

    console.log('Feedbacks encontrados para esta empresa:', feedbacks.length);
    if (feedbacks.length > 0) {
      console.log('IDs de los feedbacks encontrados:', feedbacks.map(f => f._id));
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedFeedbacks = feedbacks.map(f => {
      // Crear un objeto con los campos transformados
      const transformedFeedback = {
        _id: f._id,
        titulo: f.t,
        empleado: f.e ? {
          _id: f.e._id,
          nombre_completo: f.e.n,
          puesto: f.e.p
        } : null,
        empresa: f.c ? {
          _id: f.c._id,
          nombre: company ? company.n : 'Desconocida'
        } : null,
        respuestas: f.r ? f.r.map(r => ({
          pregunta: r.q,
          subpregunta: r.sq,
          valor_escala: r.e,
          valor_si_no: r.b,
          valor_texto: r.tx
        })) : [],
        puntuacion_total: f.p,
        anonimo: f.a,
        completado: f.co,
        fecha_creacion: f.f,
        createdAt: f.creado,
        updatedAt: f.actualizado
      };

      console.log('Feedback transformado:', transformedFeedback._id, transformedFeedback.titulo);
      return transformedFeedback;
    });

    res.status(200).json(transformedFeedbacks);
  } catch (error) {
    console.error('Error al obtener historial de feedback de la empresa:', error);
    res.status(500).json({ error: 'Error al obtener historial de feedback de la empresa' });
  }
};
