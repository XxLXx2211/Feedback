const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { LLMWhispererClientV2 } = require('llmwhisperer-client');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Initialize LLMWhisperer client
const llmWhispererClient = new LLMWhispererClientV2({
  apiKey: process.env.LLMWHISPERER_API_KEY,
  baseUrl: process.env.LLMWHISPERER_BASE_URL_V2
});

// Upload and process PDF
router.post('/upload', upload.single('pdfFile'), async (req, res) => {
  try {
    console.log('PDF upload request received');

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log(`File saved to: ${filePath}`);
    console.log(`File size: ${fs.statSync(filePath).size} bytes`);

    // Process the PDF with LLMWhisperer
    console.log('Starting PDF processing with LLMWhisperer...');
    const whisperResult = await llmWhispererClient.whisper({
      filePath: filePath,
      mode: 'form', // Using form mode for better extraction of structured data
      waitForCompletion: true,
      waitTimeout: 180
    });

    console.log('LLMWhisperer response received:', JSON.stringify(whisperResult, null, 2));

    // If extraction was successful
    if (whisperResult.status === 'processed' && whisperResult.extraction && whisperResult.extraction.result_text) {
      console.log('Extraction successful, returning results');
      // Return the extracted text
      return res.json({
        success: true,
        extractedText: whisperResult.extraction.result_text,
        metadata: whisperResult.extraction.metadata || {},
        confidenceMetadata: whisperResult.extraction.confidence_metadata || []
      });
    } else {
      console.log('Extraction in progress, returning whisper hash');
      // If extraction is still processing, return the whisper hash for later retrieval
      return res.json({
        success: true,
        status: whisperResult.status,
        whisperHash: whisperResult.whisper_hash,
        message: 'PDF is being processed. Check status later.'
      });
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Error processing PDF',
      message: error.message
    });
  }
});

// Check status of PDF processing
router.get('/status/:whisperHash', async (req, res) => {
  try {
    const { whisperHash } = req.params;
    console.log(`Checking status for whisper hash: ${whisperHash}`);

    const status = await llmWhispererClient.whisperStatus(whisperHash);
    console.log(`Status response:`, JSON.stringify(status, null, 2));

    return res.json({ success: true, status });
  } catch (error) {
    console.error('Error checking status:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Error checking status',
      message: error.message
    });
  }
});

// Retrieve processed PDF text
router.get('/retrieve/:whisperHash', async (req, res) => {
  try {
    const { whisperHash } = req.params;
    console.log(`Retrieving results for whisper hash: ${whisperHash}`);

    const result = await llmWhispererClient.whisperRetrieve(whisperHash);
    console.log(`Retrieve response received, text length: ${result.result_text ? result.result_text.length : 0}`);

    return res.json({
      success: true,
      extractedText: result.result_text || '',
      metadata: result.metadata || {},
      confidenceMetadata: result.confidence_metadata || []
    });
  } catch (error) {
    console.error('Error retrieving result:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Error retrieving result',
      message: error.message
    });
  }
});

module.exports = router;
