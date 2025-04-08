const Question = require('../models/Question');
const Feedback = require('../models/Feedback');

// Obtener todas las preguntas
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ a: true })
      .populate('c', 'n')
      .sort({ t: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedQuestions = questions.map(q => ({
      _id: q._id,
      texto: q.t,
      tipo_respuesta: q.r === 'e' ? 'escala' : q.r === 's' ? 'si_no' : 'texto',
      importancia: q.i,
      categoria: q.c ? { _id: q.c._id, nombre: q.c.n } : null,
      preguntas_si_no: q.s ? q.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
      activo: q.a,
      createdAt: q.creado,
      updatedAt: q.actualizado
    }));

    res.status(200).json(transformedQuestions);
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ error: 'Error al obtener preguntas' });
  }
};

// Obtener una pregunta por ID
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('c', 'n');

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedQuestion = {
      _id: question._id,
      texto: question.t,
      tipo_respuesta: question.r === 'e' ? 'escala' : question.r === 's' ? 'si_no' : 'texto',
      importancia: question.i,
      categoria: question.c ? { _id: question.c._id, nombre: question.c.n } : null,
      preguntas_si_no: question.s ? question.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
      activo: question.a,
      createdAt: question.creado,
      updatedAt: question.actualizado
    };

    res.status(200).json(transformedQuestion);
  } catch (error) {
    console.error('Error al obtener pregunta:', error);
    res.status(500).json({ error: 'Error al obtener pregunta' });
  }
};

// Crear una nueva pregunta
exports.createQuestion = async (req, res) => {
  try {
    const { texto, tipo_respuesta, importancia, preguntas_si_no, categoria } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'El texto de la pregunta es obligatorio' });
    }

    // Convertir tipo_respuesta al formato abreviado
    const tipoRespuestaAbreviado = tipo_respuesta === 'escala' ? 'e' :
                                  tipo_respuesta === 'si_no' ? 's' : 't';

    // Convertir preguntas_si_no al formato abreviado
    const preguntasSiNoAbreviadas = preguntas_si_no ? preguntas_si_no.map(p => ({
      t: p.texto,
      o: p.orden || 0
    })) : [];

    // Crear pregunta con campos optimizados
    const question = new Question({
      t: texto,
      r: tipoRespuestaAbreviado,
      i: importancia,
      c: categoria,
      s: tipoRespuestaAbreviado === 's' ? preguntasSiNoAbreviadas : [],
      a: true
    });

    await question.save();

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedQuestion = {
      _id: question._id,
      texto: question.t,
      tipo_respuesta: question.r === 'e' ? 'escala' : question.r === 's' ? 'si_no' : 'texto',
      importancia: question.i,
      categoria: question.c,
      preguntas_si_no: question.s ? question.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
      activo: question.a,
      createdAt: question.creado,
      updatedAt: question.actualizado
    };

    res.status(201).json(transformedQuestion);
  } catch (error) {
    console.error('Error al crear pregunta:', error);
    res.status(500).json({ error: 'Error al crear pregunta' });
  }
};

// Actualizar una pregunta
exports.updateQuestion = async (req, res) => {
  try {
    const { texto, tipo_respuesta, importancia, preguntas_si_no, activo, categoria } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'El texto de la pregunta es obligatorio' });
    }

    // Convertir tipo_respuesta al formato abreviado
    const tipoRespuestaAbreviado = tipo_respuesta === 'escala' ? 'e' :
                                  tipo_respuesta === 'si_no' ? 's' : 't';

    // Convertir preguntas_si_no al formato abreviado
    const preguntasSiNoAbreviadas = preguntas_si_no ? preguntas_si_no.map(p => ({
      t: p.texto,
      o: p.orden || 0
    })) : [];

    // Actualizar pregunta con campos optimizados
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        t: texto,
        r: tipoRespuestaAbreviado,
        i: importancia,
        s: tipoRespuestaAbreviado === 's' ? preguntasSiNoAbreviadas : [],
        a: activo !== undefined ? activo : true,
        c: categoria
      },
      { new: true, runValidators: true }
    ).populate('c', 'n');

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedQuestion = {
      _id: question._id,
      texto: question.t,
      tipo_respuesta: question.r === 'e' ? 'escala' : question.r === 's' ? 'si_no' : 'texto',
      importancia: question.i,
      categoria: question.c ? { _id: question.c._id, nombre: question.c.n } : null,
      preguntas_si_no: question.s ? question.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
      activo: question.a,
      createdAt: question.creado,
      updatedAt: question.actualizado
    };

    res.status(200).json(transformedQuestion);
  } catch (error) {
    console.error('Error al actualizar pregunta:', error);
    res.status(500).json({ error: 'Error al actualizar pregunta' });
  }
};

// Eliminar una pregunta
exports.deleteQuestion = async (req, res) => {
  try {
    // Verificar si la pregunta está siendo utilizada en algún feedback
    const isUsed = await Feedback.exists({ 'r.q': req.params.id });

    if (isUsed) {
      // En lugar de eliminar, marcar como inactiva
      const question = await Question.findByIdAndUpdate(
        req.params.id,
        { a: false },
        { new: true }
      );

      if (!question) {
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      // Transformar los datos para mantener compatibilidad con el frontend
      const transformedQuestion = {
        _id: question._id,
        texto: question.t,
        tipo_respuesta: question.r === 'e' ? 'escala' : question.r === 's' ? 'si_no' : 'texto',
        importancia: question.i,
        categoria: question.c,
        preguntas_si_no: question.s ? question.s.map(sq => ({ texto: sq.t, orden: sq.o })) : [],
        activo: question.a,
        createdAt: question.creado,
        updatedAt: question.actualizado
      };

      return res.status(200).json({
        message: 'Pregunta marcada como inactiva porque está siendo utilizada',
        question: transformedQuestion
      });
    }

    // Si no está siendo utilizada, eliminar completamente
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    res.status(200).json({ message: 'Pregunta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({ error: 'Error al eliminar pregunta' });
  }
};
