const fs = require('fs');
const path = require('path');
const { analyzePDF } = require('../services/pdfService');
const { analyzeWithGemini, generateChatResponse } = require('../services/aiService');
const cacheService = require('../services/cacheService');
const cleaningStatusService = require('../services/cleaningStatusService');

// Importar modelo para documentos PDF
const { initModel } = require('../models/PDFDocument');

// Función para obtener el modelo PDFDocument
const getPDFDocumentModel = async () => {
  try {
    return await initModel();
  } catch (error) {
    console.error('Error al obtener el modelo PDFDocument:', error);
    throw error;
  }
};

/**
 * Subir un archivo PDF con procesamiento acelerado
 */
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    console.log(`Iniciando carga rápida para PDF: ${req.file.filename}`);

    // Leer el archivo como buffer (más eficiente que base64)
    const pdfBuffer = fs.readFileSync(req.file.path);

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Crear nuevo documento en la base de datos con esquema optimizado
    const newDocument = new PDFDocument({
      t: title, // título abreviado
      d: description || '', // descripción abreviada
      f: req.file.filename, // nombre del archivo abreviado
      p: req.file.path, // ruta del archivo abreviada
      s: 'p', // estado abreviado (p=pendiente, c=completado, e=error)
      tx: '', // texto extraído abreviado
      a: '', // análisis abreviado
      pdf: pdfBuffer, // contenido del PDF como buffer (más eficiente)
      conv: [], // conversaciones vacías inicialmente
      // Nuevos campos para optimización
      processingStarted: new Date(), // Marca de tiempo para inicio de procesamiento
      priority: 'high' // Prioridad alta para procesamiento inmediato
    });

    // Guardar documento en la base de datos
    await newDocument.save();

    // Transformar para mantener compatibilidad con el frontend
    const transformedDocument = {
      _id: newDocument._id,
      title: newDocument.t,
      description: newDocument.d,
      filename: newDocument.f,
      status: 'Pendiente',
      createdAt: newDocument.creado
    };

    // Iniciar procesamiento inmediato en segundo plano
    // Usamos setImmediate para no bloquear la respuesta HTTP
    setImmediate(() => {
      // Iniciar procesamiento con prioridad alta
      processDocumentFast(newDocument._id);
    });

    // Responder inmediatamente al cliente
    res.status(201).json({
      ...transformedDocument,
      message: 'Documento subido. El procesamiento comenzará inmediatamente.',
      estimatedTime: '5-15 segundos' // Tiempo estimado optimista
    });

    console.log(`PDF ${newDocument._id} subido exitosamente, procesamiento iniciado`);
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({ error: 'Error al subir el archivo: ' + error.message });
  }
};

/**
 * Obtener todos los documentos con paginación, caché agresiva y carga rápida
 */
exports.getDocuments = async (req, res) => {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const forceRefresh = req.query.refresh === 'true';

    // Generar clave de caché basada en los parámetros de paginación
    const cacheKey = `documents_page_${page}_limit_${limit}`;

    // Verificar si tenemos una versión en caché para responder inmediatamente
    if (!forceRefresh) {
      const cachedResult = cacheService.get(cacheKey);
      if (cachedResult) {
        // Responder inmediatamente con datos en caché
        // Actualizar en segundo plano si es necesario
        if (cachedResult._timestamp && (Date.now() - cachedResult._timestamp > 30000)) { // 30 segundos
          // Actualizar en segundo plano sin bloquear la respuesta
          setTimeout(async () => {
            try {
              // Verificar si hay documentos pendientes
              const pendingDocs = cachedResult.documents?.filter(doc => doc.status === 'pending');
              if (pendingDocs && pendingDocs.length > 0) {
                console.log(`Actualizando estado de ${pendingDocs.length} documentos pendientes en segundo plano`);
                // Obtener el modelo PDFDocument
                const PDFDocument = await getPDFDocumentModel();
                // Verificar estado actual de documentos pendientes
                const pendingIds = pendingDocs.map(doc => doc._id);
                const updatedDocs = await PDFDocument.find(
                  { _id: { $in: pendingIds } },
                  { _id: 1, s: 1 }
                ).lean();

                // Si alguno cambió de estado, invalidar caché
                const statusChanged = updatedDocs.some(doc => doc.s !== 'p');
                if (statusChanged) {
                  console.log('Estado de documentos actualizado, invalidando caché');
                  cacheService.del(cacheKey);
                }
              }
            } catch (bgError) {
              console.error('Error en actualización de caché en segundo plano:', bgError);
            }
          }, 100);
        }

        return res.status(200).json(cachedResult);
      }
    }

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Buscar documentos con paginación y proyección optimizada
    const skip = (page - 1) * limit;

    // Usar getOrSet con actualización en segundo plano
    const result = await cacheService.getOrSet(cacheKey, async () => {
      // Consulta principal para obtener documentos
      const documentsPromise = PDFDocument.find({}, {
        t: 1,           // título
        d: 1,           // descripción
        f: 1,           // nombre de archivo
        s: 1,           // estado
        g: 1,           // análisis de Gemini (para verificar si está disponible)
        creado: 1,      // fecha de creación
        actualizado: 1, // fecha de actualización
        conv: 1,        // conversaciones
        processingStarted: 1,    // para calcular tiempo de procesamiento
        processingCompleted: 1   // para calcular tiempo de procesamiento
      })
      .sort({ creado: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

      // Consulta para contar documentos (en paralelo)
      const countPromise = cacheService.getOrSet('documents_total_count', async () => {
        return await PDFDocument.estimatedDocumentCount();
      }, 300); // 5 minutos de caché

      // Ejecutar ambas consultas en paralelo
      const [documents, totalDocuments] = await Promise.all([documentsPromise, countPromise]);

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(totalDocuments / limit);

      // Transformar documentos con información adicional
      const transformedDocuments = documents.map(doc => {
        // Calcular tiempo de procesamiento si está disponible
        let processingTime = null;
        if (doc.processingStarted && doc.processingCompleted) {
          processingTime = Math.round((doc.processingCompleted - doc.processingStarted) / 1000);
        }

        return {
          _id: doc._id,
          title: doc.t || 'Sin título',
          description: doc.d || '',
          filename: doc.f || 'documento.pdf',
          status: doc.s === 'p' ? 'pending' : doc.s === 'c' ? 'completed' : 'error',
          createdAt: doc.creado || new Date(),
          updatedAt: doc.actualizado || new Date(),
          hasConversation: Array.isArray(doc.conv) && doc.conv.length > 0,
          hasAnalysis: !!doc.g, // Indicador de si tiene análisis disponible
          processingTime: processingTime // Tiempo de procesamiento en segundos (si está disponible)
        };
      });

      // Construir resultado
      const result = {
        documents: transformedDocuments,
        pagination: {
          totalDocuments,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        _timestamp: Date.now(),
        _pendingCount: transformedDocuments.filter(doc => doc.status === 'pending').length,
        _errorCount: transformedDocuments.filter(doc => doc.status === 'error').length
      };

      // Si es la primera página, guardar como fallback
      if (page === 1) {
        cacheService.set('last_valid_documents_page_1_limit_20', result, 3600); // 1 hora
      }

      return result;
    }, 60, { // 1 minuto de caché
      minInterval: 2000, // 2 segundos entre actualizaciones
      backgroundRefresh: true, // Actualizar en segundo plano
      maxAge: 30000, // Considerar obsoleto después de 30 segundos
      forceRefresh: forceRefresh // Respetar el parámetro de forzar actualización
    });

    // Responder al cliente
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener documentos:', error);

    // Intentar proporcionar una respuesta fallback
    try {
      // Verificar si es un error de MongoDB
      if (error.name === 'MongoServerError') {
        console.log('Error de MongoDB detectado, enviando respuesta fallback');

        // Enviar una respuesta vacía pero válida
        return res.status(200).json({
          documents: [],
          pagination: {
            totalDocuments: 0,
            totalPages: 1,
            currentPage: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.limit) || 20,
            hasNextPage: false,
            hasPrevPage: false
          },
          _fallback: true,
          _error: 'Error de conexión a la base de datos'
        });
      }

      // Intentar obtener documentos desde la caché
      const cachedDocuments = cacheService.get('last_valid_documents_page_1_limit_20');
      if (cachedDocuments) {
        console.log('Usando documentos en caché como fallback');
        return res.status(200).json({
          ...cachedDocuments,
          _cached: true,
          _fallback: true
        });
      }
    } catch (fallbackError) {
      console.error('Error al intentar proporcionar fallback:', fallbackError);
    }

    // Si todo falla, enviar respuesta de error estándar
    res.status(500).json({
      error: 'Error al obtener documentos',
      message: 'Ha ocurrido un problema al cargar los documentos. Por favor, intenta de nuevo más tarde.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener un documento por ID con carga rápida y caché
 */
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    // Usar caché para respuesta inmediata
    const cacheKey = `document_${id}`;

    // Usar getOrSet con actualización en segundo plano
    const transformedDocument = await cacheService.getOrSet(cacheKey, async () => {
      // Obtener el modelo PDFDocument
      const PDFDocument = await getPDFDocumentModel();

      // Buscar documento con proyección optimizada
      const document = await PDFDocument.findById(id, {
        pdf: 0 // Excluir el PDF completo para mejorar rendimiento
      });

      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Si el documento está en procesamiento, verificar si ha pasado mucho tiempo
      if (document.s === 'p' && document.processingStarted) {
        const processingTime = Date.now() - document.processingStarted;
        // Si han pasado más de 2 minutos en procesamiento, intentar procesarlo nuevamente
        if (processingTime > 120000) { // 2 minutos
          console.log(`Documento ${id} en procesamiento por ${Math.round(processingTime/1000)}s, reiniciando procesamiento`);
          // Iniciar procesamiento en segundo plano
          setImmediate(() => {
            processDocumentFast(id);
          });
        }
      }

      // Transformar para mantener compatibilidad con el frontend
      return {
        _id: document._id,
        title: document.t,
        description: document.d,
        filename: document.f,
        status: document.s === 'p' ? 'Pendiente' :
                document.s === 'c' ? 'Procesado' : 'Error',
        text: document.tx,
        analysis: document.a,
        geminiAnalysis: document.g, // Análisis de Gemini
        conversations: document.conv ? document.conv.map(c => ({
          message: c.m,
          isUser: c.u,
          timestamp: c.t
        })) : [],
        createdAt: document.creado,
        updatedAt: document.actualizado,
        processingStarted: document.processingStarted,
        processingCompleted: document.processingCompleted,
        // Calcular tiempo de procesamiento si está disponible
        processingTime: document.processingStarted && document.processingCompleted ?
          Math.round((document.processingCompleted - document.processingStarted) / 1000) : null,
        _timestamp: Date.now(),
        _documentStatus: document.s
      };
    }, document => document.status !== 'Pendiente' ? 300 : 30, { // 5 minutos para documentos completos, 30 segundos para pendientes
      minInterval: 2000, // 2 segundos entre actualizaciones
      backgroundRefresh: true, // Actualizar en segundo plano
      maxAge: document => document._documentStatus === 'p' ? 5000 : 60000, // 5 segundos para pendientes, 1 minuto para completos
      forceRefresh: forceRefresh // Respetar el parámetro de forzar actualización
    });

    // Si el documento no existe, manejar el error
    if (!transformedDocument) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Responder al cliente
    res.status(200).json(transformedDocument);
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
};

/**
 * Eliminar un documento
 */
exports.deleteDocument = async (req, res) => {
  try {
    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Eliminar archivo físico si existe
    const filePath = document.p;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar documento de la base de datos
    await PDFDocument.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
};

/**
 * Analizar un PDF con carga rápida y caché
 */
exports.analyzePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    // Usar caché para respuesta inmediata
    const cacheKey = `analysis_${id}`;

    // Usar getOrSet con actualización en segundo plano para el análisis
    const analysisResult = await cacheService.getOrSet(cacheKey, async () => {
      // Obtener el modelo PDFDocument
      const PDFDocument = await getPDFDocumentModel();

      // Buscar el documento con proyección optimizada
      const document = await PDFDocument.findById(id, {
        s: 1,  // estado
        g: 1,  // análisis de Gemini
        a: 1,  // análisis estructurado
        tx: 1, // texto extraído
        processingStarted: 1 // para verificar tiempo de procesamiento
      });

      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Verificar si el documento ya ha sido procesado
      if (document.s === 'c') { // 'c' = completado/procesado
        let analysisResponse = null;

        // Si ya tiene análisis de Gemini, usarlo
        if (document.g) {
          analysisResponse = {
            analysis: document.g,
            formattedAnalysis: true,
            source: 'gemini'
          };
        }
        // Si tiene análisis estructurado, intentar usarlo
        else if (document.a) {
          try {
            // Intentar parsear el análisis estructurado
            const structuredAnalysis = JSON.parse(document.a);

            // Si tenemos elementos y resumen
            if (structuredAnalysis && structuredAnalysis.elements) {
              // Usar el resumen si existe
              if (structuredAnalysis.summary) {
                analysisResponse = {
                  analysis: cleaningStatusService.generateGeminiAnalysisText(structuredAnalysis.elements),
                  formattedAnalysis: true,
                  elements: structuredAnalysis.elements,
                  summary: structuredAnalysis.summary,
                  source: 'structured'
                };
              }
              // Si no hay resumen pero hay elementos, generarlo
              else if (structuredAnalysis.elements.length > 0) {
                const summary = cleaningStatusService.generateCleaningSummary(structuredAnalysis.elements);
                const formattedText = cleaningStatusService.generateGeminiAnalysisText(structuredAnalysis.elements);

                // Actualizar documento con el resumen generado
                await PDFDocument.findByIdAndUpdate(id, {
                  g: formattedText,
                  a: JSON.stringify({
                    ...structuredAnalysis,
                    summary: summary
                  })
                });

                analysisResponse = {
                  analysis: formattedText,
                  formattedAnalysis: true,
                  elements: structuredAnalysis.elements,
                  summary: summary,
                  source: 'generated'
                };
              }
            }
          } catch (parseError) {
            console.error('Error al parsear análisis estructurado:', parseError);
            // Continuar al siguiente paso si hay error
          }
        }

        // Si no tenemos análisis aún, intentar generarlo con nuestro servicio
        if (!analysisResponse && document.tx) {
          console.log('Generando análisis rápido con servicio de estado de limpieza...');
          const cleaningElements = cleaningStatusService.analyzeCleaningStatus(document.tx);

          if (cleaningElements && cleaningElements.length > 0) {
            console.log(`Se encontraron ${cleaningElements.length} elementos de limpieza`);
            const formattedText = cleaningStatusService.generateGeminiAnalysisText(cleaningElements);
            const summary = cleaningStatusService.generateCleaningSummary(cleaningElements);

            // Guardar el análisis en el documento
            await PDFDocument.findByIdAndUpdate(id, {
              g: formattedText,
              a: JSON.stringify({
                elements: cleaningElements,
                summary: summary
              })
            });

            analysisResponse = {
              analysis: formattedText,
              formattedAnalysis: true,
              elements: cleaningElements,
              summary: summary,
              source: 'realtime'
            };
          }
        }

        // Si aún no tenemos análisis, usar un análisis básico
        if (!analysisResponse) {
          const basicAnalysis = `Resultado análisis:\nNo se detectaron elementos de limpieza marcados en el documento.`;

          analysisResponse = {
            analysis: basicAnalysis,
            formattedAnalysis: true,
            source: 'fallback'
          };
        }

        // Añadir timestamp para control de caché
        analysisResponse._timestamp = Date.now();
        analysisResponse._documentStatus = document.s;

        return analysisResponse;
      }

      // Si el documento no está procesado, verificar si ha pasado mucho tiempo
      if (document.s === 'p' && document.processingStarted) {
        const processingTime = Date.now() - document.processingStarted;
        // Si han pasado más de 2 minutos en procesamiento, intentar procesarlo rápidamente
        if (processingTime > 120000) { // 2 minutos
          console.log(`Documento ${id} en procesamiento por ${Math.round(processingTime/1000)}s, iniciando procesamiento rápido`);

          // Iniciar procesamiento rápido en segundo plano
          setImmediate(() => {
            processDocumentFast(id);
          });

          return {
            analysis: 'El documento está siendo procesado nuevamente. Intente en 10-15 segundos.',
            status: 'reprocessing',
            formattedAnalysis: true,
            estimatedTime: '10-15 segundos',
            _timestamp: Date.now(),
            _documentStatus: 'p'
          };
        }
      }

      // Iniciar procesamiento rápido para documentos pendientes
      console.log(`Iniciando procesamiento rápido para documento ${id}`);

      // Iniciar procesamiento en segundo plano
      setImmediate(() => {
        processDocumentFast(id);
      });

      return {
        analysis: 'El documento está siendo procesado. Intente nuevamente en 5-10 segundos.',
        status: 'processing',
        formattedAnalysis: true,
        estimatedTime: '5-10 segundos',
        _timestamp: Date.now(),
        _documentStatus: document.s || 'p'
      };
    }, 300, { // 5 minutos de caché por defecto
      minInterval: 2000, // 2 segundos entre actualizaciones
      backgroundRefresh: true, // Actualizar en segundo plano
      maxAge: result => result && result._documentStatus === 'p' ? 5000 : 60000, // 5 segundos para pendientes, 1 minuto para completos
      forceRefresh: forceRefresh // Respetar el parámetro de forzar actualización
    });

    // Si el documento no existe, manejar el error
    if (!analysisResult) {
      return res.status(404).json({ error: 'Documento o análisis no encontrado' });
    }

    // Responder al cliente
    return res.status(analysisResult.status === 'processing' || analysisResult.status === 'reprocessing' ? 202 : 200).json(analysisResult);

  } catch (error) {
    console.error('Error al analizar PDF:', error);
    res.status(500).json({ error: 'Error al analizar el documento: ' + error.message });
  }
};

/**
 * Chat con un PDF
 */
exports.chatWithPDF = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Si no está procesado, no se puede chatear
    if (document.s !== 'c') { // 'c' = completado/procesado
      return res.status(400).json({ error: 'El documento aún no ha sido procesado' });
    }

    // Generar respuesta usando el servicio mejorado
    // Primero, verificar si hay análisis de Gemini
    let analysisText = '';

    if (document.g) {
      // Usar análisis de Gemini si existe
      analysisText = document.g;
    } else if (document.a) {
      try {
        // Intentar parsear el análisis estructurado
        const structuredAnalysis = JSON.parse(document.a);
        if (structuredAnalysis && structuredAnalysis.elements) {
          // Crear un análisis legible basado en los elementos identificados
          analysisText = "Resultado análisis:\n";
          structuredAnalysis.elements.forEach(el => {
            analysisText += `El estado del "${el.element}" es ${el.state}\n`;
          });

          // Añadir observaciones
          analysisText += "\nObservaciones:\n";
          structuredAnalysis.elements.forEach(el => {
            if (el.observation) {
              analysisText += `• ${el.observation}\n`;
            }
          });
        }
      } catch (parseError) {
        console.error('Error al parsear análisis estructurado:', parseError);
        // Usar el análisis como texto si no se puede parsear
        analysisText = document.a;
      }
    }

    // Si no hay análisis, intentar generarlo con el servicio de estado de limpieza
    if (!analysisText && document.tx) {
      console.log('Generando análisis de estado de limpieza para el chat...');
      const cleaningElements = cleaningStatusService.analyzeCleaningStatus(document.tx);
      if (cleaningElements && cleaningElements.length > 0) {
        analysisText = cleaningStatusService.generateGeminiAnalysisText(cleaningElements);
      }
    }

    // Generar respuesta con toda la información disponible
    const response = await generateChatResponse(message, document.tx, analysisText || document.a || '');

    if (!response) {
      return res.status(500).json({ error: 'Error al generar respuesta' });
    }

    // Guardar la conversación
    document.conv.push({
      m: message,
      u: true, // mensaje del usuario
      t: new Date()
    });

    document.conv.push({
      m: response,
      u: false, // mensaje de la IA
      t: new Date()
    });

    await document.save();

    res.status(200).json({ response });
  } catch (error) {
    console.error('Error en chat con PDF:', error);
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
};

/**
 * Procesar documento de forma asíncrona con optimización para carga rápida
 * Esta función está optimizada para procesar documentos lo más rápido posible
 */
async function processDocumentFast(documentId) {
  try {
    console.log(`Iniciando procesamiento rápido para documento: ${documentId}`);

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Buscar el documento con proyección mínima para mayor velocidad
    const document = await PDFDocument.findById(documentId, {
      pdf: 1, // Solo necesitamos el PDF
      p: 1,   // Y la ruta si existe
      s: 1    // Y el estado
    });

    if (!document) {
      console.error(`Documento no encontrado: ${documentId}`);
      return;
    }

    // Verificar si el documento ya está procesado
    if (document.s === 'c') {
      console.log(`Documento ${documentId} ya está procesado, omitiendo procesamiento rápido`);
      return;
    }

    // Marcar como en procesamiento
    await PDFDocument.findByIdAndUpdate(documentId, { s: 'p' });

    // Preparar el archivo para procesamiento
    let filePath = null;
    let isTempFile = false;

    // Intentar usar el archivo físico si existe
    if (document.p && fs.existsSync(document.p)) {
      filePath = document.p;
      console.log(`Usando archivo físico existente: ${filePath}`);
    } else {
      // Si no existe el archivo físico, usar el PDF almacenado
      const tempFilePath = path.join(__dirname, '../uploads', `temp_fast_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, document.pdf);
      filePath = tempFilePath;
      isTempFile = true;
      console.log(`Creado archivo temporal para procesamiento rápido: ${filePath}`);
    }

    // Extraer texto del PDF directamente (sin análisis completo para mayor velocidad)
    console.log(`Extrayendo texto rápidamente de: ${filePath}`);

    // Usar nuestro servicio de detección de estado de limpieza directamente
    // Primero extraemos el texto básico del PDF
    const { extractTextFromPDF } = require('../services/pdfService');
    const extractedText = await extractTextFromPDF(filePath);

    if (!extractedText) {
      throw new Error('No se pudo extraer texto del PDF');
    }

    console.log(`Texto extraído rápidamente: ${extractedText.length} caracteres`);

    // Analizar estado de limpieza con nuestro servicio especializado
    console.log('Analizando estado de limpieza rápidamente...');
    const cleaningElements = cleaningStatusService.analyzeCleaningStatus(extractedText);

    // Generar texto formateado para Gemini y resumen
    let formattedText = '';
    let structuredData = {};

    if (cleaningElements && cleaningElements.length > 0) {
      console.log(`Se encontraron ${cleaningElements.length} elementos de limpieza`);
      formattedText = cleaningStatusService.generateGeminiAnalysisText(cleaningElements);
      const summary = cleaningStatusService.generateCleaningSummary(cleaningElements);

      structuredData = {
        elements: cleaningElements,
        summary: summary
      };
    } else {
      // Si no encontramos elementos, usar un análisis básico
      console.log('No se encontraron elementos de limpieza, usando análisis básico');
      formattedText = `Resultado análisis:\nNo se detectaron elementos de limpieza marcados en el documento.`;
      structuredData = {
        elements: [],
        summary: {
          overallStatus: 'No determinado',
          elementsCount: 0
        }
      };
    }

    // Limpiar archivo temporal si se creó
    if (isTempFile && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo temporal eliminado: ${filePath}`);
    }

    // Actualizar documento con toda la información
    await PDFDocument.findByIdAndUpdate(documentId, {
      tx: extractedText,                    // Texto extraído
      g: formattedText,                     // Análisis formateado
      a: JSON.stringify(structuredData),    // Datos estructurados
      s: 'c',                               // Estado completado
      processingCompleted: new Date()        // Marca de tiempo de finalización
    });

    console.log(`Procesamiento rápido completado para documento: ${documentId}`);

    // Iniciar análisis con Gemini en segundo plano (no bloqueante)
    // Esto mejorará el análisis pero no bloqueará la disponibilidad inmediata
    setTimeout(() => {
      try {
        console.log(`Iniciando análisis con Gemini en segundo plano para: ${documentId}`);
        performGeminiAnalysis(documentId, extractedText);
      } catch (geminiError) {
        console.error(`Error en análisis Gemini en segundo plano: ${geminiError.message}`);
        // No hacemos nada más, ya que el documento ya está marcado como completado
      }
    }, 1000); // Esperar 1 segundo para no sobrecargar el sistema

  } catch (error) {
    console.error(`Error en procesamiento rápido para documento ${documentId}:`, error);

    try {
      // Marcar como error pero con texto parcial si existe
      const PDFDocument = await getPDFDocumentModel();
      const errorUpdate = {
        s: 'e', // Error
        processingError: error.message
      };

      await PDFDocument.findByIdAndUpdate(documentId, errorUpdate);
    } catch (updateError) {
      console.error(`Error al actualizar estado de error: ${updateError.message}`);
    }
  }
}

/**
 * Procesar documento de forma asíncrona
 */
/**
 * Ver un PDF sin descargar
 */
exports.viewPDF = async (req, res) => {
  try {
    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar si tenemos el PDF
    if (!document.pdf || !Buffer.isBuffer(document.pdf)) {
      return res.status(404).json({ error: 'Contenido del PDF no disponible' });
    }

    // Enviar el PDF como respuesta (ya está como buffer)

    // Configurar headers para mostrar el PDF en el navegador
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.f || 'document.pdf'}"`);
    res.setHeader('Content-Length', document.pdf.length);

    // Enviar el PDF
    res.send(document.pdf);
  } catch (error) {
    console.error('Error al ver PDF:', error);
    res.status(500).json({ error: 'Error al mostrar el documento' });
  }
};

/**
 * Procesar documento de forma asíncrona con análisis avanzado
 */
async function processDocument(documentId) {
  // Verificar si el sistema está sobrecargado antes de iniciar el procesamiento
  try {
    const { getQueuesStatus } = require('../services/queueService');
    const status = await getQueuesStatus();

    if (status.system.isOverloaded) {
      console.log(`Sistema sobrecargado, posponiendo procesamiento del documento: ${documentId}`);
      // Programar un nuevo intento en 60 segundos
      setTimeout(() => processDocument(documentId), 60000);
      return;
    }
  } catch (statusError) {
    console.error('Error al verificar estado del sistema:', statusError);
    // Continuar con el procesamiento aunque no podamos verificar el estado
  }

  try {
    console.log(`Iniciando procesamiento del documento: ${documentId}`);

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(documentId);

    if (!document) {
      console.error(`Documento no encontrado: ${documentId}`);
      return;
    }

    // Verificar si el documento ya está siendo procesado o ya está procesado
    if (document.s === 'c') { // 'c' = completado/procesado
      console.log(`Documento ${documentId} ya está procesado, omitiendo procesamiento`);
      return;
    }

    // Marcar como en procesamiento para evitar procesamiento duplicado
    await PDFDocument.findByIdAndUpdate(documentId, { s: 'p' }); // 'p' = procesando

    // Preparar el archivo para procesamiento
    let filePath = null;
    let isTempFile = false;

    // Intentar usar el archivo físico si existe
    if (document.p && fs.existsSync(document.p)) {
      filePath = document.p;
      console.log(`Usando archivo físico existente: ${filePath}`);
    } else {
      // Si no existe el archivo físico, usar el PDF almacenado
      // Guardar temporalmente el PDF para procesarlo
      const tempFilePath = path.join(__dirname, '../uploads', `temp_${Date.now()}.pdf`);
      // El PDF ya está como buffer, no necesitamos convertirlo
      fs.writeFileSync(tempFilePath, document.pdf);
      filePath = tempFilePath;
      isTempFile = true;
      console.log(`Creado archivo temporal: ${filePath}`);
    }

    // Realizar análisis completo del PDF
    console.log(`Analizando PDF: ${filePath}`);
    const analysisResult = await analyzePDF(filePath);
    console.log(`Resultado: ${analysisResult.success ? 'Exitoso' : 'Fallido'}`);

    // Limpiar archivo temporal si se creó
    if (isTempFile && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo temporal eliminado: ${filePath}`);
    }

    // Verificar resultado del análisis
    if (!analysisResult.success) {
      console.error(`Error en el análisis del PDF: ${analysisResult.error}`);
      document.s = 'e'; // 'e' = error
      document.tx = 'Error en el procesamiento: ' + (analysisResult.error || 'Error desconocido');
      await document.save();
      return;
    }

    // Extraer información relevante - usar texto mejorado si está disponible
    const extractedText = analysisResult.content.enhancedText || analysisResult.content.text;

    // Imprimir para depuración
    console.log('\n===== TEXTO PROCESADO SIN PREFIJOS [0] =====');
    console.log(extractedText);
    console.log('\n===== FIN DEL TEXTO PROCESADO =====');

    // Crear un resumen estructurado con la información de elementos identificados
    const summary = {
      pages: analysisResult.summary.pages,
      tables: analysisResult.summary.tables,
      forms: analysisResult.summary.forms,
      textLength: analysisResult.summary.textLength,
      processingTime: analysisResult.summary.processingTime,
      elementsIdentified: analysisResult.summary.elementsIdentified || 0
    };

    // Guardar información extraída
    document.tx = extractedText;
    document.a = JSON.stringify(summary); // Guardar resumen en el campo de análisis
    document.s = 'c'; // 'c' = completado/procesado

    // Crear un objeto con toda la información estructurada
    const structuredData = {
      summary: summary,
      elements: analysisResult.content.elements || [],
      metadata: analysisResult.content.metadata || {}
    };

    // Si hay tablas, añadirlas a los datos estructurados
    if (analysisResult.content.tables && analysisResult.content.tables.length > 0) {
      // Limitar el tamaño para evitar problemas con MongoDB
      structuredData.tables = analysisResult.content.tables.slice(0, 10); // Máximo 10 tablas
    }

    // Guardar datos estructurados (limitando tamaño)
    const structuredDataStr = JSON.stringify(structuredData);
    if (structuredDataStr.length < 1000000) { // Limitar a ~1MB
      document.a = structuredDataStr;
    }

    await document.save();
    console.log(`Documento procesado correctamente: ${documentId}`);

    // Verificar nuevamente si el sistema está sobrecargado antes de iniciar el análisis con Gemini
    try {
      const { getQueuesStatus } = require('../services/queueService');
      const status = await getQueuesStatus();

      if (status.system.isOverloaded) {
        console.log(`Sistema sobrecargado, posponiendo análisis con Gemini para documento: ${documentId}`);
        // Programar un nuevo intento en 2 minutos
        setTimeout(() => {
          // Solo realizar el análisis con Gemini, no todo el procesamiento
          performGeminiAnalysis(documentId, extractedText);
        }, 120000);
        return;
      }
    } catch (statusError) {
      console.error('Error al verificar estado del sistema para análisis con Gemini:', statusError);
      // Continuar con el análisis aunque no podamos verificar el estado
    }

    // Realizar análisis con Gemini si hay texto extraído
    if (extractedText && extractedText.length > 0) {
      await performGeminiAnalysis(documentId, extractedText);
    }
  } catch (error) {
    console.error(`Error al procesar documento ${documentId}:`, error);

    // Actualizar estado a error
    try {
      // Obtener el modelo PDFDocument
      const PDFDocument = await getPDFDocumentModel();
      await PDFDocument.findByIdAndUpdate(documentId, {
        s: 'e', // 'e' = error
        tx: `Error en el procesamiento: ${error.message || 'Error desconocido'}`
      });
    } catch (updateError) {
      console.error(`Error al actualizar estado del documento ${documentId}:`, updateError);
    }
  }
}

/**
 * Realizar análisis con Gemini de forma separada
 */
async function performGeminiAnalysis(documentId, extractedText) {
  try {
    if (!extractedText || extractedText.length === 0) {
      console.error(`No hay texto para analizar con Gemini para documento: ${documentId}`);
      return;
    }

    // Paso 1: Intentar usar nuestro servicio mejorado de detección de estado de limpieza
    console.log('Analizando estado de limpieza con servicio mejorado...');
    const cleaningElements = cleaningStatusService.analyzeCleaningStatus(extractedText);

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Si encontramos elementos con nuestro servicio, usarlos
    if (cleaningElements && cleaningElements.length > 0) {
      console.log(`Se encontraron ${cleaningElements.length} elementos de limpieza con el servicio mejorado`);

      // Generar texto formateado para Gemini
      const formattedText = cleaningStatusService.generateGeminiAnalysisText(cleaningElements);

      // Generar resumen
      const summary = cleaningStatusService.generateCleaningSummary(cleaningElements);
      console.log('Resumen de estado de limpieza:', JSON.stringify(summary));

      // Actualizar el documento con el análisis mejorado
      await PDFDocument.findByIdAndUpdate(documentId, {
        g: formattedText, // Campo abreviado para análisis de Gemini
        // Guardar también los elementos estructurados
        a: JSON.stringify({
          elements: cleaningElements,
          summary: summary
        })
      });

      console.log(`Análisis mejorado completado: ${formattedText.length} caracteres`);
      console.log(`Análisis mejorado completado para documento: ${documentId}`);
      return;
    }

    // Paso 2: Si no encontramos suficientes elementos, usar Gemini como respaldo
    console.log(`No se encontraron suficientes elementos, usando Gemini como respaldo...`);
    console.log(`Enviando prompt a Gemini...`);
    const geminiAnalysis = await analyzeWithGemini(extractedText);

    if (geminiAnalysis) {
      // Actualizar el documento con el análisis de Gemini
      await PDFDocument.findByIdAndUpdate(documentId, {
        g: geminiAnalysis // Campo abreviado para análisis de Gemini
      });

      console.log(`Análisis con Gemini completado: ${geminiAnalysis.length} caracteres`);
      console.log(`Análisis con Gemini completado para documento: ${documentId}`);
    } else {
      console.error(`No se pudo generar análisis con Gemini para documento: ${documentId}`);
    }
  } catch (error) {
    console.error(`Error en análisis con Gemini para documento ${documentId}:`, error);
    // No marcamos como error el documento, ya que el procesamiento principal fue exitoso
  }
}

/**
 * Chat con PDF usando IA
 */
exports.chatWithPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Buscar el documento
    const document = await PDFDocument.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar que el documento ha sido procesado
    if (document.s !== 'c') { // 'c' = completado/procesado
      return res.status(400).json({
        error: 'El documento aún no ha sido procesado',
        status: document.s
      });
    }

    // Obtener el texto extraído y el análisis
    let extractedText = document.tx || '';
    let analysisText = '';

    // No añadimos información adicional para el análisis

    try {
      if (document.a && document.a.length > 0) {
        const analysis = JSON.parse(document.a);
        if (analysis.summary) {
          analysisText = `Resumen del documento: ${JSON.stringify(analysis.summary)}`;
        }
      }
    } catch (parseError) {
      console.error('Error al parsear análisis:', parseError);
    }

    // Usar el análisis de Gemini si existe
    if (document.g) { // Campo abreviado para análisis de Gemini
      analysisText += '\n\n' + document.g;
    }

    // Generar respuesta usando el servicio de IA
    const response = await generateChatResponse(message, extractedText, analysisText);

    res.status(200).json({ response });
  } catch (error) {
    console.error('Error en chat con PDF:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de chat' });
  }
};

/**
 * Obtener análisis detallado de un documento
 */
exports.getDocumentAnalysis = async (req, res) => {
  try {
    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar si el documento ha sido procesado
    if (document.s !== 'c') { // 'c' = completado/procesado
      return res.status(400).json({
        error: 'El documento aún no ha sido procesado',
        status: document.s
      });
    }

    // Intentar parsear el análisis estructurado
    let analysis = {};
    try {
      if (document.a && document.a.length > 0) {
        analysis = JSON.parse(document.a);
      }
    } catch (parseError) {
      console.error('Error al parsear análisis:', parseError);
      // Si hay error de parseo, usar un objeto vacío
      analysis = {};
    }

    // Construir respuesta
    const response = {
      documentId: document._id,
      title: document.t,
      status: document.s,
      extractedText: document.tx ? document.tx.substring(0, 1000) + '...' : '', // Enviar solo una muestra del texto
      analysis: analysis,
      geminiAnalysis: document.g || '', // Campo abreviado para análisis de Gemini
      createdAt: document.creado,
      updatedAt: document.actualizado
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener análisis del documento:', error);
    res.status(500).json({ error: 'Error al obtener análisis del documento' });
  }
};
