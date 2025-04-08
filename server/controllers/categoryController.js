const Category = require('../models/Category');
const Question = require('../models/Question');

// Obtener todas las categorías
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ a: true }).sort({ n: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCategories = categories.map(cat => ({
      _id: cat._id,
      nombre: cat.n,
      descripcion: cat.d,
      activo: cat.a,
      createdAt: cat.creado,
      updatedAt: cat.actualizado
    }));

    res.status(200).json(transformedCategories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Obtener una categoría por ID
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCategory = {
      _id: category._id,
      nombre: category.n,
      descripcion: category.d,
      activo: category.a,
      createdAt: category.creado,
      updatedAt: category.actualizado
    };

    res.status(200).json(transformedCategory);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: 'Error al obtener categoría' });
  }
};

// Crear una nueva categoría
exports.createCategory = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategory = await Category.findOne({ n: nombre });
    if (existingCategory) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    // Crear categoría con campos optimizados
    const category = new Category({
      n: nombre,
      d: descripcion,
      a: true
    });

    await category.save();

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCategory = {
      _id: category._id,
      nombre: category.n,
      descripcion: category.d,
      activo: category.a,
      createdAt: category.creado,
      updatedAt: category.actualizado
    };

    res.status(201).json(transformedCategory);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

// Actualizar una categoría
exports.updateCategory = async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    // Verificar si ya existe otra categoría con el mismo nombre
    const existingCategory = await Category.findOne({
      n: nombre,
      _id: { $ne: req.params.id }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre' });
    }

    // Actualizar con campos optimizados
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { n: nombre, d: descripcion, a: activo !== undefined ? activo : true },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedCategory = {
      _id: category._id,
      nombre: category.n,
      descripcion: category.d,
      activo: category.a,
      createdAt: category.creado,
      updatedAt: category.actualizado
    };

    res.status(200).json(transformedCategory);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

// Eliminar una categoría
exports.deleteCategory = async (req, res) => {
  try {
    // Verificar si la categoría está siendo utilizada en alguna pregunta
    const isUsed = await Question.exists({ c: req.params.id });

    if (isUsed) {
      // En lugar de eliminar, marcar como inactiva
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { a: false },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Transformar los datos para mantener compatibilidad con el frontend
      const transformedCategory = {
        _id: category._id,
        nombre: category.n,
        descripcion: category.d,
        activo: category.a,
        createdAt: category.creado,
        updatedAt: category.actualizado
      };

      return res.status(200).json({
        message: 'Categoría marcada como inactiva porque está siendo utilizada',
        category: transformedCategory
      });
    }

    // Si no está siendo utilizada, eliminar completamente
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.status(200).json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};

// Obtener preguntas por categoría
exports.getQuestionsByCategory = async (req, res) => {
  try {
    const questions = await Question.find({
      c: req.params.id,
      a: true
    }).sort({ t: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedQuestions = questions.map(q => ({
      _id: q._id,
      texto: q.t,
      tipo_respuesta: q.r === 'e' ? 'escala' : q.r === 's' ? 'si_no' : 'texto',
      importancia: q.i,
      categoria: q.c,
      preguntas_si_no: q.s ? q.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
      activo: q.a,
      createdAt: q.creado,
      updatedAt: q.actualizado
    }));

    res.status(200).json(transformedQuestions);
  } catch (error) {
    console.error('Error al obtener preguntas por categoría:', error);
    res.status(500).json({ error: 'Error al obtener preguntas por categoría' });
  }
};
