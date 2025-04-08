require('dotenv').config();
const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:5001/api';

// Función para verificar el endpoint de estado
async function checkStatusEndpoint() {
  console.log('\n=== Verificando endpoint de estado ===');
  try {
    const response = await axios.get(`${API_URL}/status`, { timeout: 5000 });
    console.log('✅ Endpoint de estado OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Error al verificar endpoint de estado:', error.message);
    if (error.response) {
      console.error('Detalles de la respuesta:', error.response.status, error.response.data);
    }
    return false;
  }
}

// Función para verificar el endpoint de documentos
async function checkDocumentsEndpoint() {
  console.log('\n=== Verificando endpoint de documentos ===');
  try {
    console.log('Solicitando documentos (timeout: 15s)...');
    const response = await axios.get(`${API_URL}/pdf/documents`, {
      timeout: 15000, // Aumentar a 15 segundos
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 500
    });
    console.log('✅ Endpoint de documentos OK. Documentos:', Array.isArray(response.data) ? response.data.length : 'No es un array');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar endpoint de documentos:', error.message);
    if (error.response) {
      console.error('Detalles de la respuesta:', error.response.status, error.response.data);
    }
    return false;
  }
}

// Función principal
async function runAPICheck() {
  console.log('=== VERIFICANDO API ===');
  console.log('Fecha y hora:', new Date().toLocaleString());

  // Verificar endpoint de estado
  const statusOK = await checkStatusEndpoint();

  // Verificar endpoint de documentos
  const documentsOK = await checkDocumentsEndpoint();

  // Resumen
  console.log('\n=== RESUMEN ===');
  console.log('Endpoint de estado:', statusOK ? '✅ OK' : '❌ ERROR');
  console.log('Endpoint de documentos:', documentsOK ? '✅ OK' : '❌ ERROR');

  const allOK = statusOK && documentsOK;
  console.log('\nVerificación completa:', allOK ? '✅ TODO OK' : '❌ HAY PROBLEMAS');
}

// Ejecutar verificación
runAPICheck()
  .then(() => {
    console.log('\nVerificación finalizada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError durante la verificación:', error);
    process.exit(1);
  });
