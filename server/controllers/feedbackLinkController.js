const FeedbackLink = require('../models/FeedbackLink');
const Feedback = require('../models/Feedback');

// Obtener todos los enlaces de feedback
exports.getFeedbackLinks = async (req, res) => {
  try {
    const links = await FeedbackLink.find()
      .populate({
        path: 'f',
        select: 'titulo empleado empresa',
        populate: [
          { path: 'empleado', select: 'nombre_completo' },
          { path: 'empresa', select: 'nombre' }
        ]
      })
      .sort({ creado: -1 });

    res.status(200).json(links);
  } catch (error) {
    console.error('Error al obtener enlaces de feedback:', error);
    res.status(500).json({ error: 'Error al obtener enlaces de feedback' });
  }
};

// Obtener un enlace de feedback por ID
exports.getFeedbackLink = async (req, res) => {
  try {
    const link = await FeedbackLink.findById(req.params.id)
      .populate({
        path: 'f',
        select: 'titulo empleado empresa',
        populate: [
          { path: 'empleado', select: 'nombre_completo' },
          { path: 'empresa', select: 'nombre' }
        ]
      });

    if (!link) {
      return res.status(404).json({ error: 'Enlace no encontrado' });
    }

    res.status(200).json(link);
  } catch (error) {
    console.error('Error al obtener enlace de feedback:', error);
    res.status(500).json({ error: 'Error al obtener enlace de feedback' });
  }
};

// Crear un nuevo enlace de feedback
exports.createFeedbackLink = async (req, res) => {
  try {
    const { feedback, fecha_expiracion, mostrar_observaciones } = req.body;

    if (!feedback) {
      return res.status(400).json({ error: 'El feedback es obligatorio' });
    }

    // Verificar que el feedback existe
    const feedbackExists = await Feedback.exists({ _id: feedback });
    if (!feedbackExists) {
      return res.status(400).json({ error: 'El feedback no existe' });
    }

    // Verificar si ya existe un enlace activo para este feedback
    const existingLink = await FeedbackLink.findOne({
      f: feedback,
      a: true
    });

    if (existingLink) {
      return res.status(200).json({
        message: 'Ya existe un enlace activo para este feedback',
        link: existingLink
      });
    }

    // Generar un token UUID v4
    const token = require('uuid').v4();
    console.log('Token generado en feedbackLinkController:', token);

    const link = new FeedbackLink({
      f: feedback,
      t: token, // Usar el token generado explícitamente
      e: fecha_expiracion,
      o: mostrar_observaciones
    });

    // Verificar que el token no sea nulo
    if (!link.t) {
      return res.status(400).json({ error: 'No se pudo generar un token válido' });
    }

    console.log('Link creado:', link);

    await link.save();

    // Devolver el enlace en el formato esperado por el cliente
    res.status(201).json({
      link: {
        _id: link._id,
        t: link.t,
        f: link.f,
        a: link.a,
        e: link.e,
        o: link.o,
        creado: link.creado
      }
    });
  } catch (error) {
    console.error('Error al crear enlace de feedback:', error);
    res.status(500).json({ error: 'Error al crear enlace de feedback' });
  }
};

// Actualizar un enlace de feedback
exports.updateFeedbackLink = async (req, res) => {
  try {
    const { activo, fecha_expiracion, mostrar_observaciones } = req.body;

    const link = await FeedbackLink.findByIdAndUpdate(
      req.params.id,
      { a: activo, e: fecha_expiracion, o: mostrar_observaciones },
      { new: true, runValidators: true }
    );

    if (!link) {
      return res.status(404).json({ error: 'Enlace no encontrado' });
    }

    res.status(200).json(link);
  } catch (error) {
    console.error('Error al actualizar enlace de feedback:', error);
    res.status(500).json({ error: 'Error al actualizar enlace de feedback' });
  }
};

// Eliminar un enlace de feedback
exports.deleteFeedbackLink = async (req, res) => {
  try {
    const link = await FeedbackLink.findByIdAndDelete(req.params.id);

    if (!link) {
      return res.status(404).json({ error: 'Enlace no encontrado' });
    }

    res.status(200).json({ message: 'Enlace eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar enlace de feedback:', error);
    res.status(500).json({ error: 'Error al eliminar enlace de feedback' });
  }
};
