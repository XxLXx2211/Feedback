const Feedback = require('../models/Feedback');
const FeedbackLink = require('../models/FeedbackLink');
const Question = require('../models/Question');
const Employee = require('../models/Employee');

// Obtener todos los feedbacks
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('e', 'n p') // e = empleado, n = nombre_completo, p = puesto
      .populate('c', 'n'); // c = empresa, n = nombre

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedFeedbacks = feedbacks.map(f => ({
      _id: f._id,
      titulo: f.t,
      empleado: f.e ? {
        _id: f.e._id,
        nombre_completo: f.e.n,
        puesto: f.e.p
      } : null,
      empresa: f.c ? {
        _id: f.c._id,
        nombre: f.c.n
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
    }));

    res.json(transformedFeedbacks);
  } catch (error) {
    console.error('Error al obtener feedbacks:', error);
    res.status(500).json({ mensaje: 'Error al obtener feedbacks' });
  }
};

// Obtener un feedback por ID
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('e', 'n p') // e = empleado, n = nombre_completo, p = puesto
      .populate('c', 'n'); // c = empresa, n = nombre

    if (!feedback) {
      return res.status(404).json({ mensaje: 'Feedback no encontrado' });
    }

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedFeedback = {
      _id: feedback._id,
      titulo: feedback.t,
      empleado: feedback.e ? {
        _id: feedback.e._id,
        nombre_completo: feedback.e.n,
        puesto: feedback.e.p
      } : null,
      empresa: feedback.c ? {
        _id: feedback.c._id,
        nombre: feedback.c.n
      } : null,
      respuestas: feedback.r ? feedback.r.map(r => ({
        pregunta: r.q,
        subpregunta: r.sq,
        valor_escala: r.e,
        valor_si_no: r.b,
        valor_texto: r.tx
      })) : [],
      puntuacion_total: feedback.p,
      anonimo: feedback.a,
      completado: feedback.co,
      fecha_creacion: feedback.f,
      createdAt: feedback.creado,
      updatedAt: feedback.actualizado
    };

    res.json(transformedFeedback);
  } catch (error) {
    console.error('Error al obtener feedback:', error);
    res.status(500).json({ mensaje: 'Error al obtener feedback' });
  }
};

// Crear un nuevo feedback
exports.createFeedback = async (req, res) => {
  try {
    // Transformar los datos al formato abreviado que espera el modelo
    const { titulo, empleado, empresa, anonimo, preguntas } = req.body;

    // Crear objeto con campos abreviados
    const feedbackData = {
      t: titulo,                // t = titulo
      e: empleado,              // e = empleado
      c: empresa || undefined,  // c = empresa
      a: anonimo || false,      // a = anonimo
      r: []                     // r = respuestas (inicialmente vacío)
    };

    // Crear y guardar el feedback
    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // Transformar la respuesta para mantener compatibilidad con el frontend
    const transformedFeedback = {
      _id: feedback._id,
      titulo: feedback.t,
      empleado: feedback.e,
      empresa: feedback.c,
      respuestas: [],
      puntuacion_total: feedback.p,
      anonimo: feedback.a,
      completado: feedback.co,
      fecha_creacion: feedback.f,
      createdAt: feedback.creado,
      updatedAt: feedback.actualizado
    };

    res.status(201).json(transformedFeedback);
  } catch (error) {
    console.error('Error al crear feedback:', error);
    res.status(500).json({ mensaje: 'Error al crear feedback' });
  }
};

// Actualizar un feedback
exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ mensaje: 'Feedback no encontrado' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Error al actualizar feedback:', error);
    res.status(500).json({ mensaje: 'Error al actualizar feedback' });
  }
};

// Eliminar un feedback
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ mensaje: 'Feedback no encontrado' });
    }

    res.json({ mensaje: 'Feedback eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar feedback:', error);
    res.status(500).json({ mensaje: 'Error al eliminar feedback' });
  }
};

// Obtener un feedback por token de enlace
exports.getFeedbackByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const link = await FeedbackLink.findOne({ t: token })
      .populate({
        path: 'f',
        populate: [
          { path: 'e', select: 'n p' },
          { path: 'c', select: 'n' }
        ]
      });

    if (!link) {
      return res.status(404).json({ error: 'Enlace no encontrado' });
    }

    // Verificar si el enlace está activo
    if (!link.a) {
      return res.status(403).json({ error: 'Este enlace ya no está activo' });
    }

    // Verificar si el enlace ha expirado
    if (link.e && new Date() > new Date(link.e)) {
      link.a = false;
      await link.save();
      return res.status(403).json({ error: 'Este enlace ha expirado' });
    }

    // Obtener las preguntas para este feedback
    const questions = await Question.find({ a: true }).sort({ t: 1 });

    // Transformar los datos para mantener compatibilidad con el frontend
    const transformedLink = {
      _id: link._id,
      feedback: link.f ? link.f._id : null,
      token: link.t,
      activo: link.a,
      fecha_expiracion: link.e,
      mostrar_observaciones: link.o,
      createdAt: link.creado
    };

    const transformedFeedback = link.f ? {
      _id: link.f._id,
      titulo: link.f.t,
      empleado: link.f.e ? {
        _id: link.f.e._id,
        nombre_completo: link.f.e.n,
        puesto: link.f.e.p
      } : null,
      empresa: link.f.c ? {
        _id: link.f.c._id,
        nombre: link.f.c.n
      } : null,
      respuestas: link.f.r ? link.f.r.map(r => ({
        pregunta: r.q,
        subpregunta: r.sq,
        valor_escala: r.e,
        valor_si_no: r.b,
        valor_texto: r.tx
      })) : [],
      puntuacion_total: link.f.p,
      anonimo: link.f.a,
      completado: link.f.co,
      fecha_creacion: link.f.f,
      createdAt: link.f.creado,
      updatedAt: link.f.actualizado
    } : null;

    const transformedQuestions = questions.map(q => ({
      _id: q._id,
      texto: q.t,
      tipo_respuesta: q.r === 'e' ? 'escala' : q.r === 's' ? 'si_no' : 'texto',
      importancia: q.i,
      categoria: q.c,
      preguntas_si_no: q.s ? q.s.map((sq, index) => ({
        _id: `${index}`, // Añadimos un ID único basado en el índice
        texto: sq.t,
        orden: sq.o
      })) : [],
      activo: q.a
    }));

    res.status(200).json({
      link: transformedLink,
      feedback: transformedFeedback,
      questions: transformedQuestions
    });
  } catch (error) {
    console.error('Error al obtener feedback por token:', error);
    res.status(500).json({ error: 'Error al obtener feedback' });
  }
};

// Enviar respuestas a un feedback
exports.submitAnswers = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestas } = req.body;

    if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ error: 'Se requieren respuestas válidas' });
    }

    // Buscar el feedback
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback no encontrado' });
    }

    // Verificar si ya está completado
    if (feedback.co) {
      return res.status(400).json({ error: 'Este feedback ya ha sido completado' });
    }

    // Transformar las respuestas al formato abreviado
    const respuestasAbreviadas = respuestas.map(resp => {
      const respuestaObj = {
        q: resp.pregunta // ID de la pregunta
      };

      // Agregar subpregunta si existe
      if (resp.subpregunta) {
        respuestaObj.sq = resp.subpregunta;
      }

      // Agregar el valor según el tipo de respuesta
      if (resp.valor_escala !== undefined) {
        respuestaObj.e = resp.valor_escala;
      } else if (resp.valor_si_no !== undefined) {
        respuestaObj.b = resp.valor_si_no;
      } else if (resp.valor_texto) {
        respuestaObj.tx = resp.valor_texto;
      }

      return respuestaObj;
    });

    // Calcular puntuación
    let puntuacion = 100; // Puntuación inicial
    let tieneRespuestasNegativas = false;

    // Verificar si hay respuestas negativas (NO)
    respuestasAbreviadas.forEach(resp => {
      if (resp.b === false) { // Si alguna respuesta es NO
        tieneRespuestasNegativas = true;
      }
    });

    // Si hay respuestas negativas, ajustar la puntuación
    if (tieneRespuestasNegativas) {
      // Calcular puntuación basada en la proporción de respuestas positivas
      const totalRespuestasSiNo = respuestasAbreviadas.filter(r => r.b !== undefined).length;
      const respuestasPositivas = respuestasAbreviadas.filter(r => r.b === true).length;

      if (totalRespuestasSiNo > 0) {
        puntuacion = Math.round((respuestasPositivas / totalRespuestasSiNo) * 100);
      } else {
        puntuacion = 0;
      }
    }

    // Actualizar el feedback
    feedback.r = respuestasAbreviadas;
    feedback.p = puntuacion;
    feedback.co = true; // Marcar como completado
    feedback.actualizado = new Date();

    await feedback.save();

    res.status(200).json({
      mensaje: 'Respuestas enviadas correctamente',
      puntuacion
    });
  } catch (error) {
    console.error('Error al enviar respuestas:', error);
    res.status(500).json({ error: 'Error al procesar las respuestas' });
  }
};
