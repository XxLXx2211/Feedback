/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum size limit (10MB).'
    });
  }
  
  // Handle other specific errors
  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only PDF files are allowed.'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

module.exports = errorHandler;
