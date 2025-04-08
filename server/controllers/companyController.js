const Company = require('../models/Company');

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
