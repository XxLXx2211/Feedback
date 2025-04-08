import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Alert, Table, Spinner, Modal, Button } from 'react-bootstrap';
import { FaUpload, FaFilePdf, FaTrash, FaComments, FaDownload, FaSearchPlus, FaPaperPlane, FaServer } from 'react-icons/fa';
import { uploadPDF, getDocuments, getDocument, deleteDocument, analyzePDF, chatWithPDF } from '../services/pdfService';
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
  }, []);

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

  // Función para cargar documentos
  const loadDocuments = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await getDocuments();
      console.log('Respuesta del servidor (documentos):', response);

      // Procesar la respuesta
      let newDocuments = [];
      if (Array.isArray(response)) {
        console.log(`Se recibieron ${response.length} documentos directamente`);
        newDocuments = response;
      } else if (response?.data && Array.isArray(response.data)) {
        console.log(`Se recibieron ${response.data.length} documentos en response.data`);
        newDocuments = response.data;
      } else {
        console.warn('Formato de respuesta inesperado:', response);
        newDocuments = [];
      }

      // Verificar si hay cambios en los documentos
      const currentDocsJson = JSON.stringify(documents.map(d => ({ id: d._id, status: d.status })));
      const newDocsJson = JSON.stringify(newDocuments.map(d => ({ id: d._id, status: d.status })));
      const hasChanges = currentDocsJson !== newDocsJson;

      if (hasChanges) {
        console.log('Actualizando lista de documentos');

        // Verificar si algún documento cambió de estado a 'completed'
        const newlyCompleted = newDocuments.filter(newDoc => {
          const oldDoc = documents.find(doc => doc._id === newDoc._id);
          return oldDoc && oldDoc.status !== 'completed' && newDoc.status === 'completed';
        });

        // Cargar detalles completos para documentos completados
        const enhancedDocuments = await Promise.all(
          newDocuments.map(async (doc) => {
            // Solo cargar detalles para documentos completados
            if (doc.status === 'completed') {
              try {
                // Obtener análisis del documento
                const analysisResponse = await analyzePDF(doc._id);
                if (analysisResponse && analysisResponse.data && analysisResponse.data.analysis) {
                  // Añadir el análisis de Gemini al documento
                  return {
                    ...doc,
                    geminiAnalysis: analysisResponse.data.analysis
                  };
                }
              } catch (error) {
                console.error(`Error al cargar análisis para documento ${doc._id}:`, error);
              }
            }
            return doc;
          })
        );

        // Actualizar la lista de documentos con los detalles completos
        setDocuments(enhancedDocuments);

        // Si hay documentos recién completados, mostrar notificación y habilitar funcionalidades
        if (newlyCompleted.length > 0) {
          console.log('Documentos recién procesados:', newlyCompleted.map(doc => doc.title));
          // Mostrar notificación
          setUploadSuccess('¡Documento(s) procesado(s) correctamente! Ya puedes usar el chat y otras funcionalidades.');
          setTimeout(() => setUploadSuccess(''), 5000); // Ocultar después de 5 segundos
        }
      }

      // Iniciar o detener polling según sea necesario
      const hasPendingDocuments = newDocuments.some(doc => doc.status !== 'completed' && doc.status !== 'error');
      if (hasPendingDocuments) {
        if (!pollingInterval) {
          startPolling();
        }
      } else if (pollingInterval) {
        // Detener polling si no hay documentos pendientes
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } catch (err) {
      console.error('Error al cargar documentos:', err);
      setError('Error al cargar los documentos. Por favor, intenta de nuevo.');
      setDocuments([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

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

      await uploadPDF(formData);

      setUploadSuccess('Archivo subido correctamente. El documento se está procesando...');
      setSelectedFile(null);
      setFileTitle('');
      setFileDescription('');

      // Recargar la lista de documentos
      await loadDocuments();

      // Iniciar polling para verificar cuando el documento esté procesado
      startPolling();

      // Limpiar el input de archivo
      const fileInput = document.getElementById('file-upload');
      if (fileInput) {
        fileInput.value = '';
      }
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
    // Abrir el PDF en una nueva pestaña
    window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/pdf/view/${id}`, '_blank');
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

  // Función para determinar el estado de limpieza basado en los resultados del análisis
  const getCleaningStatus = (doc) => {
    // Si el documento no está procesado o tiene error, devolver un estado de procesamiento
    if (!doc || doc.status !== 'completed') {
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

    // Intentar obtener el análisis de Gemini
    const getDocumentDetails = async (id) => {
      try {
        const response = await getDocument(id);
        return response;
      } catch (error) {
        console.error('Error al obtener detalles del documento:', error);
        return null;
      }
    };

    // Contar los diferentes estados en los resultados
    let excelente = 0;
    let bien = 0;
    let regular = 0;
    let deficiente = 0;
    let total = 0;

    // Analizar el texto del análisis de Gemini
    if (doc.geminiAnalysis) {
      // Usar el análisis de Gemini directamente
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
    } else {
      // Intentar cargar el documento para obtener el análisis
      console.log('Cargando detalles del documento para análisis...');

      // Hacer una solicitud para obtener el análisis
      const loadAnalysis = async () => {
        try {
          const response = await analyzePDF(doc._id);
          if (response && response.data && response.data.analysis) {
            const analysisText = response.data.analysis;

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
        } catch (error) {
          console.error('Error al cargar análisis:', error);
        }
      };

      // Ejecutar la carga de análisis (no esperamos a que termine)
      loadAnalysis();

      // Si no tenemos datos suficientes, devolver un estado desconocido
      if (total === 0) {
        return {
          icon: '❓',
          text: 'Sin datos',
          class: 'unknown'
        };
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
                            <span className={`cleaning-status ${getCleaningStatus(doc).class}`}>
                              <span className="status-icon">{getCleaningStatus(doc).icon}</span>
                              <span className="status-text">{getCleaningStatus(doc).text}</span>
                              {doc.status !== 'completed' && doc.status !== 'error' && (
                                <Spinner animation="border" size="sm" className="ms-1" style={{ width: '0.7rem', height: '0.7rem' }} />
                              )}
                            </span>
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
