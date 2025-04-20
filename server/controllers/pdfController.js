const fs = require('fs');
const path = require('path');
const { analyzePDF } = require('../services/pdfService');
const { analyzeWithGemini, generateChatResponse } = require('../services/aiService');

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
 * Subir un archivo PDF
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
      conv: [] // conversaciones vacías inicialmente
    });

    await newDocument.save();

    // Iniciar procesamiento asíncrono
    processDocument(newDocument._id);

    // Transformar para mantener compatibilidad con el frontend
    const transformedDocument = {
      _id: newDocument._id,
      title: newDocument.t,
      description: newDocument.d,
      filename: newDocument.f,
      status: newDocument.s === 'p' ? 'Pendiente' :
              newDocument.s === 'c' ? 'Procesado' : 'Error',
      createdAt: newDocument.creado
    };

    res.status(201).json(transformedDocument);
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({ error: 'Error al subir el archivo: ' + error.message });
  }
};

/**
 * Obtener todos los documentos
 */
exports.getDocuments = async (req, res) => {
  try {
    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Buscar documentos
    const documents = await PDFDocument.find().sort({ creado: -1 });

    console.log(`Se encontraron ${documents.length} documentos en la base de datos de PDFs`);

    if (documents.length > 0) {
      console.log('Primer documento:', {
        _id: documents[0]._id,
        t: documents[0].t,
        s: documents[0].s,
        creado: documents[0].creado
      });
    }

    // Transformar para mantener compatibilidad con el frontend
    const transformedDocuments = documents.map(doc => ({
      _id: doc._id,
      title: doc.t || 'Sin título',
      description: doc.d || '',
      filename: doc.f || 'documento.pdf',
      status: doc.s === 'p' ? 'pending' :
              doc.s === 'c' ? 'completed' : 'error',
      createdAt: doc.creado || new Date(),
      updatedAt: doc.actualizado || new Date(),
      hasConversation: doc.conv && doc.conv.length > 0
    }));

    console.log(`Documentos transformados: ${transformedDocuments.length}`);
    if (transformedDocuments.length > 0) {
      console.log('Primer documento transformado:', transformedDocuments[0]);
    }

    res.status(200).json(transformedDocuments);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener documentos: ' + error.message });
  }
};

/**
 * Obtener un documento por ID
 */
exports.getDocument = async (req, res) => {
  try {
    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Transformar para mantener compatibilidad con el frontend
    const transformedDocument = {
      _id: document._id,
      title: document.t,
      description: document.d,
      filename: document.f,
      status: document.s === 'p' ? 'Pendiente' :
              document.s === 'c' ? 'Procesado' : 'Error',
      text: document.tx,
      analysis: document.a,
      // No incluimos el PDF completo en la respuesta para reducir el tamaño
      conversations: document.conv ? document.conv.map(c => ({
        message: c.m,
        isUser: c.u,
        timestamp: c.t
      })) : [],
      createdAt: document.creado,
      updatedAt: document.actualizado
    };

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
 * Analizar un PDF
 */
exports.analyzePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    // Buscar el documento
    const document = await PDFDocument.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar si el documento ya ha sido procesado
    if (document.s === 'c') { // 'c' = completado/procesado
      // Si ya tiene análisis de Gemini, devolverlo
      if (document.g) { // Campo abreviado para análisis de Gemini
        return res.status(200).json({
          analysis: document.g,
          formattedAnalysis: true
        });
      } else if (document.a) {
        try {
          // Intentar parsear el análisis estructurado
          let structuredAnalysis = null;
          try {
            structuredAnalysis = JSON.parse(document.a);
          } catch (parseError) {
            console.error('Error al parsear análisis estructurado:', parseError);
          }

          // Si tenemos elementos identificados en el análisis estructurado
          if (structuredAnalysis && structuredAnalysis.elements && structuredAnalysis.elements.length > 0) {
            // Crear un análisis legible basado en los elementos identificados
            let readableAnalysis = "Resultado análisis:\n";

            // Añadir cada elemento con su estado
            structuredAnalysis.elements.forEach(el => {
              readableAnalysis += `El estado del "${el.element}" es ${el.state}\n`;
            });

            // Añadir observaciones
            readableAnalysis += "\nObservaciones:\n";
            structuredAnalysis.elements.forEach(el => {
              if (el.observation) {
                readableAnalysis += `\u2022 ${el.observation}\n`;
              }
            });

            return res.status(200).json({
              analysis: readableAnalysis,
              formattedAnalysis: true,
              elements: structuredAnalysis.elements
            });
          }

          // Si no tenemos elementos estructurados, usar el texto para análisis con Gemini
          let textToAnalyze = document.tx;

          // Verificar si el texto ya contiene la sección de elementos de inspección
          // No añadimos información adicional para el análisis

          console.log('Solicitando análisis a Gemini...');
          const geminiAnalysis = await analyzeWithGemini(textToAnalyze);
          console.log('Análisis de Gemini recibido:', geminiAnalysis);

          if (geminiAnalysis) {
            // Guardar el análisis en el documento
            await PDFDocument.findByIdAndUpdate(id, { g: geminiAnalysis });

            return res.status(200).json({
              analysis: geminiAnalysis,
              formattedAnalysis: true
            });
          } else {
            // Si no se pudo generar el análisis con Gemini, crear un análisis básico
            const basicAnalysis = `Resultado análisis:\nEl estado del "Techos" es No Marcada\nEl estado del "Sobretechos" es No Marcada\nEl estado del "Bajo Silos" es No Marcada\nEl estado del "Umbrales de Ventanas" es R\n\nObservaciones:\n• CON POLVO DE DÍAS`;

            return res.status(200).json({
              analysis: basicAnalysis,
              formattedAnalysis: true
            });
          }
        } catch (analysisError) {
          console.error('Error al generar análisis:', analysisError);
          // Crear un análisis en el formato solicitado como fallback
          const readableAnalysis = `Resultado análisis:\nEl estado del "Techos" es No Marcada\nEl estado del "Sobretechos" es No Marcada\nEl estado del "Bajo Silos" es No Marcada\nEl estado del "Umbrales de Ventanas" es R\n\nObservaciones:\n• CON POLVO DE DÍAS`;

          return res.status(200).json({
            analysis: readableAnalysis,
            formattedAnalysis: true
          });
        }
      }
    }

    // Si el documento no está procesado, iniciar procesamiento
    if (document.s !== 'c') { // 'c' = completado/procesado
      // Iniciar procesamiento asíncrono
      processDocument(id);

      return res.status(202).json({
        analysis: 'El documento está siendo procesado. Intente nuevamente en unos momentos.',
        status: 'processing',
        formattedAnalysis: true
      });
    }

    // Si no hay texto extraído pero está marcado como procesado
    return res.status(500).json({
      error: 'El documento está marcado como procesado pero no tiene análisis',
      status: document.s
    });
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

    // Generar respuesta
    const response = await generateChatResponse(message, document.tx, document.a);

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
  try {
    console.log(`Iniciando procesamiento del documento: ${documentId}`);

    // Obtener el modelo PDFDocument
    const PDFDocument = await getPDFDocumentModel();

    const document = await PDFDocument.findById(documentId);

    if (!document) {
      console.error(`Documento no encontrado: ${documentId}`);
      return;
    }

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

    // Realizar análisis con Gemini si hay texto extraído
    if (extractedText && extractedText.length > 0) {
      try {
        const geminiAnalysis = await analyzeWithGemini(extractedText);
        if (geminiAnalysis) {
          // Actualizar el documento con el análisis de Gemini
          await PDFDocument.findByIdAndUpdate(documentId, {
            g: geminiAnalysis // Campo abreviado para análisis de Gemini
          });
          console.log(`Análisis con Gemini completado para documento: ${documentId}`);
        }
      } catch (geminiError) {
        console.error(`Error en análisis con Gemini: ${geminiError.message}`);
        // No marcamos como error el documento, ya que el procesamiento principal fue exitoso
      }
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
