import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Form, Alert, Table, Spinner, Modal, Button } from 'react-bootstrap';
import { FaUpload, FaFilePdf, FaTrash, FaComments, FaDownload, FaSearchPlus, FaPaperPlane, FaServer, FaSync } from 'react-icons/fa';
import { uploadPDF, getDocuments, getDocument, deleteDocument, analyzePDF, chatWithPDF, fixDocumentAnalysis } from '../services/pdfService';
import './PDFAnalysis.css';

const PDFAnalysis = () => {
  // Estados para manejar la carga de archivos
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Estados para documentos
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null); // Estado para el intervalo de polling

  // Estados para el chat
  const [showChat, setShowChat] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Estados para análisis
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  // Cargar documentos al montar el componente
  useEffect(() => {
    loadDocuments();

    // Limpiar el intervalo de polling cuando se desmonte el componente
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [loadDocuments, pollingInterval]);

  // Función para iniciar el polling de documentos pendientes
  const startPolling = () => {
    // Detener cualquier polling existente
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Iniciar nuevo polling cada 5 segundos
    const interval = setInterval(() => {
      // Verificar si hay documentos pendientes
      const hasPendingDocuments = documents.some(doc => doc.status !== 'completed' && doc.status !== 'error');

      if (hasPendingDocuments) {
        console.log('Verificando estado de documentos pendientes...');
        loadDocuments(false); // Cargar documentos sin mostrar spinner
      } else {
        // Si no hay documentos pendientes, detener el polling
        clearInterval(interval);
        setPollingInterval(null);
        console.log('Polling detenido: no hay documentos pendientes');
      }
    }, 5000); // Verificar cada 5 segundos

    setPollingInterval(interval);
    console.log('Polling iniciado para documentos pendientes');
  };

  // Estado para paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalDocuments: 0
  });

  // Función para cargar documentos (envuelta en useCallback)
  const loadDocuments = useCallback(async (showLoading = true, page = 1) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      // Obtener documentos con paginación
      const response = await getDocuments({ page, limit: pagination.pageSize });
      console.log('Respuesta del servidor (documentos):', response);

      // Actualizar información de paginación
      if (response.pagination) {
        setPagination(response.pagination);
      }

      // Procesar la respuesta
      let newDocuments = [];
      if (response.documents && Array.isArray(response.documents)) {
        console.log(`Se recibieron ${response.documents.length} documentos (página ${response.pagination?.currentPage || 1} de ${response.pagination?.totalPages || 1})`);
        newDocuments = response.documents;
      } else if (Array.isArray(response)) {
        console.log(`Se recibieron ${response.length} documentos directamente (formato antiguo)`);
        newDocuments = response;
      } else {
        console.warn('Formato de respuesta inesperado:', response);
        newDocuments = [];
      }

      // Simplificar la lógica de actualización: siempre actualizar los documentos
      console.log('Actualizando lista de documentos con nuevos datos.');
      const preparedDocuments = newDocuments.map(doc => {
        const existingDoc = documents.find(d => d._id === doc._id);
        return {
          ...doc,
          analysisLoaded: existingDoc?.analysisLoaded || false,
          analysisLoading: existingDoc?.analysisLoading || false,
          geminiAnalysis: existingDoc?.geminiAnalysis || null
        };
      });
      setDocuments(preparedDocuments);
      console.log('Documentos cargados y actualizados:', preparedDocuments); // Nuevo log

      // Iniciar o detener polling según sea necesario
      const hasPendingDocuments = preparedDocuments.some(doc => doc.status !== 'completed' && doc.status !== 'error');
      if (hasPendingDocuments) {
        if (!pollingInterval) {
          startPolling();
        }
      } else if (pollingInterval) {
        // Detener polling si no hay documentos pendientes
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Cargar análisis para documentos completados que no tienen análisis cargado
      preparedDocuments.forEach(doc => {
        if (doc.status === 'completed' && !doc.analysisLoaded && !doc.analysisLoading) {
          // Marcar como cargando para evitar múltiples solicitudes
          doc.analysisLoading = true;

          // Cargar el análisis en segundo plano con un pequeño retraso
          setTimeout(() => {
            loadDocumentAnalysis(doc._id);
          }, 500);
        }
      });

      // No hay necesidad de newlyCompleted aquí, ya que el polling se encarga de las notificaciones
    } catch (err) {
      console.error('Error al cargar documentos:', err);
      setError('Error al cargar los documentos. Por favor, intenta de nuevo.');
      setDocuments([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [documents, pagination.pageSize, pollingInterval, startPolling]); // Dependencias de useCallback

  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Establecer título predeterminado basado en el nombre del archivo
      setFileTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError('Por favor, selecciona un archivo PDF.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', fileTitle || selectedFile.name);
      formData.append('description', fileDescription);

      // Subir el PDF
      const uploadedDoc = await uploadPDF(formData);
      console.log('Documento subido:', uploadedDoc);

      setUploadSuccess('Archivo subido correctamente. El documento se está procesando...');
      setSelectedFile(null);
      setFileTitle('');
      setFileDescription('');

      // Limpiar el input de archivo
      const fileInput = document.getElementById('file-upload');
      if (fileInput) {
        fileInput.value = '';
      }

      // Recargar la lista de documentos
      await loadDocuments(true);

      // Iniciar polling para verificar cuando el documento esté procesado
      startPolling();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setUploadError('Error al subir el archivo. Por favor, intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Manejar análisis de PDF
  const handleAnalyzePDF = async (id) => {
    try {
      setAnalyzing(true);
      setShowAnalysis(true);
      setAnalysisResult('');

      console.log('Analizando documento:', id);
      const response = await analyzePDF(id);
      console.log('Respuesta del análisis:', response);

      if (response && response.analysis) {
        setAnalysisResult(response.analysis);
      } else if (response && response.data && response.data.analysis) {
        setAnalysisResult(response.data.analysis);
      } else {
        setError('Error al analizar el documento: ' + (response?.error || response?.data?.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error al analizar PDF:', err);
      setError('Error al analizar el documento. Por favor, intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Manejar cierre del modal de análisis
  const handleCloseAnalysis = () => {
    setShowAnalysis(false);
    setAnalysisResult('');
  };

  // Manejar apertura del chat
  const handleOpenChat = async (id) => {
    try {
      console.log('Abriendo chat para documento:', id);
      // Obtener el documento
      const response = await getDocument(id);
      console.log('Respuesta del documento:', response);

      let document;
      if (response && response.data) {
        document = response.data;
      } else if (response && response._id) {
        document = response;
      } else {
        throw new Error('Formato de respuesta inesperado');
      }

      setCurrentDocumentId(id);
      setCurrentDocument(document);
      setMessages([
        {
          id: 1,
          content: `Hola, soy un asistente de IA. Puedo responder preguntas sobre el documento "${document.title || 'seleccionado'}". ¿En qué puedo ayudarte?`,
          isUser: false
        }
      ]);
      setShowChat(true);
    } catch (err) {
      console.error('Error al abrir chat:', err);
      setError('Error al abrir el chat. Por favor, intenta de nuevo.');
    }
  };

  // Manejar cierre del chat
  const handleCloseChat = () => {
    setShowChat(false);
    setCurrentDocumentId(null);
    setCurrentDocument(null);
    setMessages([]);
    setNewMessage('');
  };

  // Manejar envío de mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentDocumentId) {
      return;
    }

    const messageText = newMessage.trim();
    const messageId = Date.now();

    // Agregar mensaje del usuario
    const userMessage = {
      id: messageId,
      content: messageText,
      isUser: true
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setNewMessage('');

    try {
      setSendingMessage(true);
      console.log('Enviando mensaje al servidor:', {
        documentId: currentDocumentId,
        message: messageText
      });

      // Enviar mensaje a la API
      const response = await chatWithPDF(currentDocumentId, messageText);
      console.log('Respuesta del chat:', response);

      // Agregar respuesta de la IA
      let responseText = '';
      if (response && response.response) {
        responseText = response.response;
      } else if (response && response.data && response.data.response) {
        responseText = response.data.response;
      } else {
        throw new Error('Formato de respuesta inesperado');
      }

      const aiMessage = {
        id: messageId + 1,
        content: responseText,
        isUser: false
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);

      // Agregar mensaje de error
      const errorMessage = {
        id: messageId + 1,
        content: 'Error al procesar tu mensaje. Por favor, intenta de nuevo.',
        isUser: false,
        isError: true
      };

      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Manejar visualización de PDF
  const handleViewPDF = (id) => {
    // Obtener la URL base de la API desde el archivo de configuración
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5009/api';
    // Abrir el PDF en una nueva pestaña
    window.open(`${API_URL}/pdf/view/${id}`, '_blank');
  };

  // Manejar descarga de PDF
  const handleDownloadPDF = async (id) => {
    try {
      // Obtener el documento
      const document = await getDocument(id);

      // Crear un enlace temporal para descargar el PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${document.pdfBase64}`;
      link.download = document.filename || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      setError('Error al descargar el documento.');
    }
  };

  // Función para cargar el análisis de un documento con reintentos automáticos
  const loadDocumentAnalysis = async (docId, forceRefresh = false) => {
    try {
      console.log(`Cargando análisis para documento ${docId}... ${forceRefresh ? '(Forzando recarga)' : ''}`);

      // Verificar si el documento existe en la lista actual
      const docIndex = documents.findIndex(d => d._id === docId);
      if (docIndex === -1) {
        console.warn(`Documento ${docId} no encontrado en la lista actual`);
        return null;
      }

      // Verificar si el documento ya tiene análisis cargado y no estamos forzando recarga
      if (!forceRefresh && documents[docIndex].analysisLoaded && documents[docIndex].geminiAnalysis) {
        console.log(`El documento ${docId} ya tiene análisis cargado`);
        return documents[docIndex].geminiAnalysis;
      }

      // Verificar si el documento ya ha tenido demasiados intentos
      if (documents[docIndex].analysisAttempts && documents[docIndex].analysisAttempts >= 3) {
        console.warn(`Demasiados intentos para cargar análisis del documento ${docId}`);

        // Marcar como cargado con error
        const updatedDocs = [...documents];
        updatedDocs[docIndex] = {
          ...updatedDocs[docIndex],
          analysisLoaded: true,
          analysisLoading: false,
          analysisError: true,
          geminiAnalysis: 'No se pudo cargar el análisis después de varios intentos.'
        };
        setDocuments(updatedDocs);
        return null;
      }

      // Marcar el documento como cargando (para evitar múltiples solicitudes)
      const updatingDocs = [...documents];
      updatingDocs[docIndex] = {
        ...updatingDocs[docIndex],
        analysisLoading: true,
        analysisAttempts: (updatingDocs[docIndex].analysisAttempts || 0) + 1,
        analysisLoadingStartTime: Date.now(), // Añadir marca de tiempo para controlar tiempo de carga
        autoRetryScheduled: false // Resetear flag de reintento automático
      };
      setDocuments(updatingDocs);

      // Configurar un timeout para la carga del análisis
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000); // 15 segundos de timeout (reducido para mejor experiencia)
      });

      // Solicitar el análisis al servidor con timeout y parámetro de forzar recarga
      const analysisPromise = analyzePDF(docId, forceRefresh);
      const response = await Promise.race([analysisPromise, timeoutPromise])
        .catch(error => {
          console.error(`Error o timeout al cargar análisis para documento ${docId}:`, error);
          return {
            error: true,
            status: error.message === 'Timeout' ? 'timeout' : 'error',
            analysis: `Error al cargar análisis: ${error.message}`
          };
        });

      console.log(`Respuesta de análisis para documento ${docId}:`, response);

      // Obtener el índice actualizado del documento
      const currentDocIndex = documents.findIndex(d => d._id === docId);
      if (currentDocIndex === -1) {
        console.warn(`Documento ${docId} ya no existe en la lista`);
        return null;
      }

      // Crear una copia de la lista actual de documentos
      const updatedDocs = [...documents];

      // Verificar si la respuesta contiene el análisis
      if (response && response.analysis && !response.error) {
        // Actualizar el documento con el análisis exitoso
        updatedDocs[currentDocIndex] = {
          ...updatedDocs[currentDocIndex],
          geminiAnalysis: response.analysis,
          analysisLoaded: true,
          analysisLoading: false,
          analysisError: false
        };

        // Actualizar el estado
        setDocuments(updatedDocs);
        console.log(`Análisis cargado correctamente para documento ${docId}`);
        return response.analysis;
      } else {
        // Manejar errores o respuestas sin análisis
        const errorMessage = response.error ?
          response.analysis || 'Error al cargar el análisis.' :
          'No se encontró análisis para este documento.';

        // Si es un timeout, programar un nuevo intento
        if (response.status === 'timeout' && (updatedDocs[currentDocIndex].analysisAttempts || 0) < 3) {
          updatedDocs[currentDocIndex] = {
            ...updatedDocs[currentDocIndex],
            analysisLoading: false
          };
          setDocuments(updatedDocs);

          // Programar un nuevo intento después de 5 segundos
          console.log(`Programando nuevo intento para documento ${docId}...`);
          setTimeout(() => {
            loadDocumentAnalysis(docId);
          }, 5000);

          return null;
        }

        // Si no es timeout o ya se han agotado los intentos, marcar como error
        updatedDocs[currentDocIndex] = {
          ...updatedDocs[currentDocIndex],
          analysisLoaded: true,
          analysisLoading: false,
          analysisError: true,
          geminiAnalysis: errorMessage
        };
        setDocuments(updatedDocs);
      }
      return null;
    } catch (error) {
      console.error(`Error inesperado al cargar análisis para documento ${docId}:`, error);

      // Marcar el documento como no cargando en caso de error
      const docIndex = documents.findIndex(d => d._id === docId);
      if (docIndex !== -1) {
        const updatedDocs = [...documents];
        updatedDocs[docIndex] = {
          ...updatedDocs[docIndex],
          analysisLoading: false,
          analysisError: true
        };
        setDocuments(updatedDocs);
      }

      return null;
    }
  };

  // Función para determinar el estado de limpieza basado en los resultados del análisis
  const getCleaningStatus = (doc) => {
    // Si el documento no existe, devolver un estado de error
    if (!doc) {
      return {
        icon: '❌',
        text: 'Error',
        class: 'error'
      };
    }

    // Si el documento no está procesado, devolver un estado de procesamiento
    if (doc.status !== 'completed') {
      return {
        icon: '⏳',
        text: 'Procesando...',
        class: 'processing'
      };
    }

    // Si el documento tiene error, devolver un estado de error
    if (doc.status === 'error') {
      return {
        icon: '❌',
        text: 'Error',
        class: 'error'
      };
    }

    // Si el documento tiene error de análisis, mostrar error
    if (doc.analysisError) {
      return {
        icon: '⚠️',
        text: 'Error de análisis',
        class: 'error'
      };
    }

    // Si el documento está completado pero no tiene análisis cargado
    if (!doc.geminiAnalysis && !doc.analysisLoading) {
      // Marcar que estamos cargando el análisis
      doc.analysisLoading = true;

      // Inicializar contador de intentos si no existe
      if (!doc.analysisAttempts) {
        doc.analysisAttempts = 0;
      }

      // Cargar el análisis (sin esperar)
      setTimeout(() => {
        loadDocumentAnalysis(doc._id);
      }, 100);

      // Mientras tanto, mostrar estado de carga
      return {
        icon: '⏳',
        text: 'Cargando análisis...',
        class: 'loading'
      };
    }

    // Si el análisis está cargando, mostrar estado de carga con el número de intento
    if (doc.analysisLoading) {
      // Si se está corrigiendo el análisis, mostrar mensaje especial
      if (doc.fixingAnalysis) {
        return {
          icon: '🔧', // Emoji de llave inglesa
          text: 'Corrigiendo análisis...',
          class: 'loading'
        };
      }

      // Si es una recarga forzada, mostrar mensaje especial
      if (doc.forceReloading) {
        return {
          icon: '⏳',
          text: 'Recargando análisis...',
          class: 'loading'
        };
      }

      // Mostrar el número de intento si hay más de uno
      const attemptText = doc.analysisAttempts > 1 ? ` (Intento ${doc.analysisAttempts}/3)` : '';

      // Si llevamos más de 10 segundos cargando, programar un reintento automático
      if (doc.analysisLoadingStartTime && (Date.now() - doc.analysisLoadingStartTime > 10000) && !doc.autoRetryScheduled) {
        doc.autoRetryScheduled = true;
        console.log(`Programando reintento automático para documento ${doc._id}...`);
        setTimeout(() => {
          forceLoadAnalysis(doc._id);
        }, 1000);
      }

      return {
        icon: '⏳',
        text: `Cargando análisis${attemptText}`,
        class: 'loading'
      };
    }

    // Contar los diferentes estados en los resultados
    let excelente = 0;
    let bien = 0;
    let regular = 0;
    let deficiente = 0;
    let total = 0;

    // Analizar el texto del análisis
    if (doc.geminiAnalysis) {
      const analysisText = doc.geminiAnalysis;

      // Buscar patrones como "El estado del "X" es Y"
      const statePattern = /El estado del "([^"]+)" es ([^\n]+)/g;
      let match;

      while ((match = statePattern.exec(analysisText)) !== null) {
        const element = match[1];
        const state = match[2].trim().toUpperCase();

        total++;
        if (state === 'E' || state === 'EXCELENTE') {
          excelente++;
        } else if (state === 'B' || state === 'BUENO') {
          bien++;
        } else if (state === 'R' || state === 'REGULAR') {
          regular++;
        } else if (state === 'D' || state === 'DEFICIENTE' || state.includes('DEFICIENTE')) {
          deficiente++;
        }
      }
    }

    // Si no hay elementos analizados, devolver un estado desconocido
    if (total === 0) {
      return {
        icon: '❓',
        text: 'Sin datos',
        class: 'unknown'
      };
    }

    // Calcular porcentajes
    const regularPercent = total > 0 ? (regular / total) * 100 : 0;

    // Determinar el estado según las reglas
    if (deficiente > 3) {
      return {
        icon: '🔴',
        text: 'Deficiente',
        class: 'deficient'
      };
    } else if (deficiente > 0) {
      // Si hay al menos un elemento deficiente (pero no más de 3), mostrar amarillo
      return {
        icon: '🟡',
        text: 'Regular',
        class: 'regular'
      };
    } else if (regularPercent > 25) {
      return {
        icon: '🟡',
        text: 'Regular',
        class: 'regular'
      };
    } else if (regularPercent === 25) {
      return {
        icon: '🟢🔸',
        text: 'Bien con observaciones',
        class: 'good-with-obs'
      };
    } else {
      return {
        icon: '🟢',
        text: 'Excelente',
        class: 'excellent'
      };
    }
  };

  // Función para corregir errores de análisis
  const handleFixAnalysis = async (docId) => {
    try {
      // Buscar el documento en la lista
      const docIndex = documents.findIndex(d => d._id === docId);
      if (docIndex === -1) {
        console.warn(`Documento ${docId} no encontrado en la lista actual`);
        return;
      }

      // Mostrar indicador visual de que estamos corrigiendo
      const updatedDocs = [...documents];
      updatedDocs[docIndex] = {
        ...updatedDocs[docIndex],
        analysisLoaded: false,
        analysisLoading: true,
        analysisError: false,
        analysisAttempts: 0,
        geminiAnalysis: null,
        fixingAnalysis: true // Indicador de corrección
      };
      setDocuments(updatedDocs);

      // Mostrar mensaje de proceso
      setUploadSuccess('Corrigiendo análisis del documento...');

      // Llamar al servicio para corregir el análisis
      const result = await fixDocumentAnalysis(docId);

      if (result.success) {
        // Actualizar el documento con el nuevo análisis
        const fixedDocs = [...documents];
        fixedDocs[docIndex] = {
          ...fixedDocs[docIndex],
          analysisLoaded: true,
          analysisLoading: false,
          analysisError: false,
          geminiAnalysis: result.analysis,
          fixingAnalysis: false,
          status: 'completed' // Actualizar estado
        };
        setDocuments(fixedDocs);

        // Mostrar mensaje de éxito
        setUploadSuccess(`Análisis corregido exitosamente. Se encontraron ${result.elementsFound} elementos.`);
        setTimeout(() => setUploadSuccess(''), 5000);
      } else {
        // Actualizar el documento con el error
        const errorDocs = [...documents];
        errorDocs[docIndex] = {
          ...errorDocs[docIndex],
          analysisLoaded: false,
          analysisLoading: false,
          analysisError: true,
          fixingAnalysis: false
        };
        setDocuments(errorDocs);

        // Mostrar mensaje de error
        setError(`Error al corregir análisis: ${result.message}`);
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      console.error(`Error al corregir análisis para documento ${docId}:`, error);
      setError(`Error al corregir análisis: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Función para forzar la carga del análisis
  const forceLoadAnalysis = async (docId) => {
    try {
      // Buscar el documento en la lista
      const docIndex = documents.findIndex(d => d._id === docId);
      if (docIndex === -1) {
        console.warn(`Documento ${docId} no encontrado en la lista actual`);
        return;
      }

      // Mostrar indicador visual de que estamos recargando
      const updatedDocs = [...documents];
      updatedDocs[docIndex] = {
        ...updatedDocs[docIndex],
        analysisLoaded: false,
        analysisLoading: true, // Mostrar que estamos cargando
        analysisError: false,
        analysisAttempts: 0,
        geminiAnalysis: null,
        forceReloading: true // Indicador de recarga forzada
      };
      setDocuments(updatedDocs);

      // Cargar el análisis inmediatamente con parámetro de forzar recarga
      setTimeout(() => {
        loadDocumentAnalysis(docId, true); // Pasar true para forzar recarga
      }, 100);

      // Mostrar mensaje de éxito temporal
      setUploadSuccess('Recargando análisis del documento...');
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (error) {
      console.error(`Error al forzar la carga del análisis para documento ${docId}:`, error);
      setError(`Error al recargar el análisis: ${error.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Manejar eliminación de documento
  const handleDeleteDocument = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
      try {
        await deleteDocument(id);
        setDocuments(documents.filter(doc => doc._id !== id));
      } catch (err) {
        console.error('Error al eliminar documento:', err);
        setError('Error al eliminar el documento.');
      }
    }
  };

  return (
    <div className="pdf-analysis-page">
      <div className="page-header">
        <h1 className="page-title">Supervisión Efectiva</h1>
        <p className="page-description">
          Sube archivos PDF para analizarlos con inteligencia artificial
        </p>
      </div>

      <Row>
        <Col lg={6} className="mb-4">
          <Card className="upload-card">
            <Card.Body>
              <Card.Title>Subir Nuevo Archivo</Card.Title>

              {uploadError && (
                <Alert variant="danger" onClose={() => setUploadError('')} dismissible>
                  {uploadError}
                </Alert>
              )}

              {uploadSuccess && (
                <Alert variant="success" onClose={() => setUploadSuccess('')} dismissible>
                  {uploadSuccess}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Seleccionar Archivo PDF</Form.Label>
                  <div className="custom-file-upload">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="d-none"
                    />
                    <label htmlFor="file-upload" className="btn btn-outline-primary w-100">
                      <FaUpload className="me-2" />
                      {selectedFile ? selectedFile.name : 'Seleccionar archivo PDF'}
                    </label>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Título</Form.Label>
                  <Form.Control
                    type="text"
                    value={fileTitle}
                    onChange={(e) => setFileTitle(e.target.value)}
                    placeholder="Ingresa un título para el archivo"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Descripción (opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="Ingresa una descripción para el archivo"
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                  {isUploading && <Spinner animation="border" size="sm" className="ms-2" />}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaFilePdf className="me-2" />
                Documentos Subidos
              </h5>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={loadDocuments}
              >
                Actualizar
              </button>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Cargando documentos...</p>
                </div>
              ) : error ? (
                <Alert variant="danger">{error}</Alert>
              ) : !documents || documents.length === 0 ? (
                <Alert variant="info">
                  No hay documentos subidos. Sube un PDF para comenzar.
                </Alert>
              ) : (
                <div className="documents-table-container">
                  <Table responsive className="documents-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Estado De Limpieza</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc._id}>
                          <td>{doc.title}</td>
                          <td>
                            <div className="cleaning-status-container d-flex align-items-center">
                              <span className={`cleaning-status ${getCleaningStatus(doc).class}`}>
                                <span className="status-icon">{getCleaningStatus(doc).icon}</span>
                                <span className="status-text">{getCleaningStatus(doc).text}</span>
                                {doc.status !== 'completed' && doc.status !== 'error' && (
                                  <Spinner animation="border" size="sm" className="ms-1" style={{ width: '0.7rem', height: '0.7rem' }} />
                                )}
                              </span>
                              {(getCleaningStatus(doc).class === 'loading' || getCleaningStatus(doc).class === 'unknown') && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="reload-btn ms-2 p-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    forceLoadAnalysis(doc._id);
                                  }}
                                  title="Forzar recarga del análisis"
                                >
                                  <FaSync size="14" />
                                </Button>
                              )}
                              {getCleaningStatus(doc).class === 'error' && (
                                <>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="reload-btn ms-2 p-0"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      forceLoadAnalysis(doc._id);
                                    }}
                                    title="Forzar recarga del análisis"
                                  >
                                    <FaSync size="14" />
                                  </Button>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="fix-btn ms-2 p-0 text-warning"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleFixAnalysis(doc._id);
                                    }}
                                    title="Corregir análisis"
                                  >
                                    <FaServer size="14" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                          <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">

                              <Button
                                variant="info"
                                size="sm"
                                className="action-btn"
                                onClick={() => handleOpenChat(doc._id)}
                                disabled={doc.status !== 'completed'}
                                title="Chat con IA"
                              >
                                <FaComments />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="action-btn"
                                onClick={() => handleViewPDF(doc._id)}
                                title="Ver PDF"
                              >
                                <FaFilePdf />
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                className="action-btn"
                                onClick={() => handleDownloadPDF(doc._id)}
                                title="Descargar PDF"
                              >
                                <FaDownload />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="action-btn"
                                onClick={() => handleDeleteDocument(doc._id)}
                                title="Eliminar"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Controles de paginación */}
                  {pagination.totalPages > 1 && (
                    <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
                      <div className="pagination-info">
                        Página {pagination.currentPage} de {pagination.totalPages} ({pagination.totalDocuments} documentos)
                      </div>
                      <div className="pagination-buttons">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          disabled={!pagination.hasPrevPage}
                          onClick={() => loadDocuments(true, pagination.currentPage - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="ms-2"
                          disabled={!pagination.hasNextPage}
                          onClick={() => loadDocuments(true, pagination.currentPage + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de chat */}
      <Modal show={showChat} onHide={handleCloseChat} size="lg" centered className="chat-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            Chat con IA - {currentDocument?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="chat-messages">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.isUser ? 'user-message' : 'bot-message'} ${message.isError ? 'error-message' : ''}`}
              >
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Form className="chat-input-form w-100" onSubmit={handleSendMessage}>
            <div className="d-flex">
              <Form.Control
                type="text"
                placeholder="Escribe tu mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sendingMessage}
              />
              <Button
                variant="primary"
                type="submit"
                className="ms-2"
                disabled={sendingMessage || !newMessage.trim()}
              >
                {sendingMessage ? <Spinner animation="border" size="sm" /> : <FaPaperPlane />}
              </Button>
            </div>
          </Form>
        </Modal.Footer>
      </Modal>

      {/* Modal de análisis */}
      <Modal show={showAnalysis} onHide={handleCloseAnalysis} size="lg" centered className="analysis-modal">
        <Modal.Header closeButton>
          <Modal.Title>Análisis de Documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {analyzing ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Analizando documento con IA...</p>
              <p className="text-muted small">Esto puede tomar unos momentos</p>
            </div>
          ) : (
            <div className="analysis-result">
              <pre className="analysis-text p-3 bg-white border rounded"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                {analysisResult || 'No hay resultados disponibles.'}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAnalysis}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PDFAnalysis;
