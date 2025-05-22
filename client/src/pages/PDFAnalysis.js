import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Form, Alert, Table, Spinner, Modal, Button } from 'react-bootstrap';
import { FaUpload, FaFilePdf, FaTrash, FaComments, FaDownload, FaPaperPlane, FaServer, FaSync } from 'react-icons/fa';
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

  // Estado para paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalDocuments: 0
  });

  // Función para cargar el análisis de un documento con reintentos automáticos
  const loadDocumentAnalysis = useCallback(async (docId, forceRefresh = false) => {
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
        console.error(`Error al cargar análisis para documento ${docId}: ${errorMessage}`);
        return null;
      }
    } catch (err) {
      console.error(`Excepción al cargar análisis para documento ${docId}:`, err);
      // Actualizar el estado del documento a error si ocurre una excepción
      const docIndex = documents.findIndex(d => d._id === docId);
      if (docIndex !== -1) {
        const updatedDocs = [...documents];
        updatedDocs[docIndex] = {
          ...updatedDocs[docIndex],
          analysisLoaded: true,
          analysisLoading: false,
          analysisError: true,
          geminiAnalysis: 'Error inesperado al cargar el análisis.'
        };
        setDocuments(updatedDocs);
      }
      return null;
    }
  }, [documents, pollingInterval, analyzePDF]);

  // Función para iniciar el polling de documentos pendientes
  const startPolling = useCallback(() => {
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
        // Aquí se llama a loadDocuments, por eso debe estar definida antes
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
  }, [documents, pollingInterval]); // Dependencias de useCallback

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
  }, [documents, pagination.pageSize, pollingInterval, startPolling, loadDocumentAnalysis]); // Dependencias de useCallback

  // Cargar documentos al montar el componente
  useEffect(() => {
    loadDocuments();

    // Limpiar el intervalo de polling cuando se desmonte el componente
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [loadDocuments, pollingInterval]); // Dependencias de useCallback

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

  // Manejar eliminación de documento
  const handleDeleteDocument = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.')) {
      try {
        await deleteDocument(id);
        setUploadSuccess('Documento eliminado correctamente.');
        setTimeout(() => setUploadSuccess(''), 3000);
        loadDocuments(); // Recargar la lista de documentos
      } catch (err) {
        console.error('Error al eliminar documento:', err);
        setError('Error al eliminar el documento. Por favor, intenta de nuevo.');
      }
    }
  };

  // Función para forzar la carga del análisis (útil para reintentos manuales)
  const forceLoadAnalysis = async (docId) => {
    try {
      setUploadSuccess('Forzando recarga del análisis...');
      await loadDocumentAnalysis(docId, true); // Forzar recarga
      setUploadSuccess('Análisis recargado o en proceso.');
    } catch (err) {
      console.error('Error al forzar recarga de análisis:', err);
      setError('Error al forzar la recarga del análisis.');
    } finally {
      setTimeout(() => setUploadSuccess(''), 3000);
    }
  };

  // Función para corregir el análisis de un documento
  const handleFixAnalysis = async (docId) => {
    try {
      setUploadSuccess('Intentando corregir el análisis...');
      await fixDocumentAnalysis(docId);
      setUploadSuccess('Solicitud de corrección enviada. El análisis se actualizará pronto.');
      loadDocuments(); // Recargar para ver el estado actualizado
    } catch (err) {
      console.error('Error al corregir análisis:', err);
      setError('Error al intentar corregir el análisis. Por favor, intenta de nuevo.');
    } finally {
      setTimeout(() => setUploadSuccess(''), 3000);
    }
  };

  // Función para obtener el estado de limpieza y análisis
  const getCleaningStatus = (doc) => {
    if (doc.status === 'pending') {
      return { variant: 'warning', text: 'Pendiente' };
    } else if (doc.status === 'processing') {
      return { variant: 'info', text: 'Procesando...' };
    } else if (doc.status === 'completed') {
      if (doc.analysisLoading) {
        return { variant: 'primary', text: 'Analizando...' };
      } else if (doc.analysisError) {
        return { variant: 'danger', text: 'Error de Análisis' };
      } else if (doc.geminiAnalysis) {
        return { variant: 'success', text: 'Análisis Completo' };
      } else {
        return { variant: 'secondary', text: 'Listo para Analizar' };
      }
    } else if (doc.status === 'error') {
      return { variant: 'danger', text: 'Error de Procesamiento' };
    }
    return { variant: 'secondary', text: 'Desconocido' };
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="pdf-analysis-page">
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="primary" />
        </Container>
      </div>
    );
  }

  return (
    <div className="pdf-analysis-page">
      <Container fluid>
        <div className="page-header">
          <h1 className="page-title">Análisis de Documentos PDF</h1>
          <p className="page-description">
            Sube y analiza documentos PDF para obtener información clave y chatear con su contenido.
          </p>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

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

        <Card className="mb-4 upload-card">
          <Card.Body>
            <Card.Title className="mb-3">Subir Nuevo Documento PDF</Card.Title>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="file-upload" className="mb-3">
                <Form.Label>Seleccionar Archivo PDF</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Título del Documento (Opcional)</Form.Label>
                <Form.Control
                  type="text"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="Ej: Informe Anual 2023"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Descripción (Opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="Breve descripción del contenido del PDF"
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                disabled={isUploading}
                className="d-flex align-items-center"
              >
                {isUploading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" /> Subiendo...
                  </>
                ) : (
                  <>
                    <FaUpload className="me-2" /> Subir PDF
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Card.Title className="mb-3">Documentos Subidos</Card.Title>
            {documents.length === 0 ? (
              <div className="text-center py-5">
                <FaFilePdf className="no-data-icon" />
                <p className="mb-3 text-muted">No hay documentos PDF subidos aún.</p>
                <Button variant="primary" onClick={() => document.getElementById('file-upload').click()}>
                  Subir Primer PDF
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover responsive className="documents-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Descripción</th>
                      <th>Estado</th>
                      <th>Fecha de Subida</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => {
                      const status = getCleaningStatus(doc);
                      return (
                        <tr key={doc._id}>
                          <td>{doc.title}</td>
                          <td>{doc.description || 'N/A'}</td>
                          <td>
                            <Badge bg={status.variant}>{status.text}</Badge>
                            {doc.analysisLoading && (
                              <Spinner animation="border" size="sm" className="ms-2" />
                            )}
                          </td>
                          <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="info"
                                size="sm"
                                title="Ver PDF"
                                onClick={() => handleViewPDF(doc._id)}
                                disabled={doc.status !== 'completed'}
                              >
                                <FaEye />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                title="Descargar PDF"
                                onClick={() => handleDownloadPDF(doc._id)}
                                disabled={doc.status !== 'completed'}
                              >
                                <FaDownload />
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                title="Chatear con PDF"
                                onClick={() => handleOpenChat(doc._id)}
                                disabled={doc.status !== 'completed' || doc.analysisLoading || doc.analysisError || !doc.geminiAnalysis}
                              >
                                <FaComments />
                              </Button>
                              <Button
                                variant="warning"
                                size="sm"
                                title="Forzar Análisis"
                                onClick={() => forceLoadAnalysis(doc._id)}
                                disabled={doc.status !== 'completed' || doc.analysisLoading}
                              >
                                <FaSync />
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                title="Corregir Análisis"
                                onClick={() => handleFixAnalysis(doc._id)}
                                disabled={doc.status !== 'completed' || doc.analysisLoading}
                              >
                                <FaServer />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                title="Eliminar Documento"
                                onClick={() => handleDeleteDocument(doc._id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Modal de Chat */}
      <Modal show={showChat} onHide={handleCloseChat} size="lg" centered className="chat-modal">
        <Modal.Header closeButton>
          <Modal.Title>Chatear con {currentDocument?.title || 'Documento'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="chat-modal-body">
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.isUser ? 'user-message' : 'ai-message'} ${msg.isError ? 'error-message' : ''}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <Form onSubmit={handleSendMessage} className="chat-input-form">
            <Form.Control
              type="text"
              placeholder="Escribe tu mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendingMessage}
            />
            <Button type="submit" disabled={sendingMessage}>
              {sendingMessage ? <Spinner animation="border" size="sm" /> : <FaPaperPlane />}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PDFAnalysis;
