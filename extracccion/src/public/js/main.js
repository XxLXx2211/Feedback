document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const loadingSection = document.getElementById('loadingSection');
  const resultSection = document.getElementById('resultSection');
  const statusMessage = document.getElementById('statusMessage');
  const extractedText = document.getElementById('extractedText');
  const structuredInfo = document.getElementById('structuredInfo');
  const copyBtn = document.getElementById('copyBtn');

  let currentWhisperHash = null;
  let statusCheckInterval = null;

  // Handle form submission
  uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(uploadForm);
    const fileInput = document.getElementById('pdfFile');

    if (!fileInput.files.length) {
      alert('Please select a PDF file to upload');
      return;
    }

    // Show loading state
    uploadBtn.disabled = true;
    loadingSection.style.display = 'block';
    resultSection.style.display = 'none';
    loadingSection.classList.remove('text-danger');
    statusMessage.textContent = 'Uploading and processing your PDF...';

    try {
      console.log('Uploading PDF file...');
      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Error processing PDF');
      }

      // If extraction is complete
      if (data.extractedText) {
        console.log('Extraction complete, displaying results');
        displayResults(data);
      } else {
        // If extraction is still processing
        console.log('Extraction in progress, starting status check');
        currentWhisperHash = data.whisperHash;
        statusMessage.textContent = `PDF is being processed. Status: ${data.status || 'processing'}. Please wait...`;

        // Start checking status
        startStatusCheck();
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent = `Error: ${error.message}`;
      loadingSection.classList.add('text-danger');
      resultSection.style.display = 'none';
    } finally {
      uploadBtn.disabled = false;
    }
  });

  // Function to start checking status
  function startStatusCheck() {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }

    statusCheckInterval = setInterval(checkStatus, 5000); // Check every 5 seconds
  }

  // Function to check processing status
  async function checkStatus() {
    if (!currentWhisperHash) return;

    try {
      console.log(`Checking status for hash: ${currentWhisperHash}`);
      const response = await fetch(`/api/pdf/status/${currentWhisperHash}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Status response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Error checking status');
      }

      // Update status message
      statusMessage.textContent = `Status: ${data.status.status || 'unknown'}`;

      // If processing is complete
      if (data.status.status === 'processed') {
        console.log('Processing complete, retrieving results');
        clearInterval(statusCheckInterval);
        retrieveResults();
      }
    } catch (error) {
      console.error('Error checking status:', error);
      statusMessage.textContent = `Error checking status: ${error.message}`;
      loadingSection.classList.add('text-danger');
      clearInterval(statusCheckInterval);
    }
  }

  // Function to retrieve results
  async function retrieveResults() {
    if (!currentWhisperHash) return;

    try {
      statusMessage.textContent = 'Retrieving results...';
      console.log(`Retrieving results for hash: ${currentWhisperHash}`);

      const response = await fetch(`/api/pdf/retrieve/${currentWhisperHash}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Retrieve response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Error retrieving results');
      }

      displayResults(data);
    } catch (error) {
      console.error('Error retrieving results:', error);
      statusMessage.textContent = `Error retrieving results: ${error.message}`;
      loadingSection.classList.add('text-danger');
      resultSection.style.display = 'none';
    }
  }

  // Function to display results
  function displayResults(data) {
    console.log('Displaying results');

    // Display raw text
    if (data.extractedText && data.extractedText.trim().length > 0) {
      extractedText.textContent = data.extractedText;
      console.log(`Extracted text length: ${data.extractedText.length} characters`);
    } else {
      extractedText.textContent = 'No text extracted';
      console.warn('No text was extracted from the PDF');
    }

    // Try to extract structured information
    try {
      const structuredData = extractStructuredData(data.extractedText || '');
      displayStructuredData(structuredData);
    } catch (error) {
      console.error('Error extracting structured data:', error);
      structuredInfo.innerHTML = '<p class="text-danger">Error extracting structured information</p>';
    }

    // Hide loading, show results
    loadingSection.style.display = 'none';
    resultSection.style.display = 'block';

    // Scroll to results
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Function to extract structured data from text
  function extractStructuredData(text) {
    if (!text) return {};

    const data = {};

    // Try to extract common fields
    // This is a simple implementation - in a real app, you might use more sophisticated methods

    // Look for dates
    const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
    const dates = text.match(dateRegex) || [];
    if (dates.length) data.dates = dates;

    // Look for amounts/prices
    const amountRegex = /\$\s*\d+(?:[.,]\d+)*/g;
    const amounts = text.match(amountRegex) || [];
    if (amounts.length) data.amounts = amounts;

    // Look for email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    if (emails.length) data.emails = emails;

    // Look for phone numbers
    const phoneRegex = /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?)[\s-]?\d{3}[\s-]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    if (phones.length) data.phones = phones;

    // Look for names (simple implementation)
    const nameRegex = /[A-Z][a-z]+ [A-Z][a-z]+/g;
    const names = text.match(nameRegex) || [];
    if (names.length) data.names = names;

    return data;
  }

  // Function to display structured data
  function displayStructuredData(data) {
    if (Object.keys(data).length === 0) {
      structuredInfo.innerHTML = '<p class="text-muted">No structured information could be extracted.</p>';
      return;
    }

    let html = '';

    for (const [key, values] of Object.entries(data)) {
      html += `<div class="mb-2">
        <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
        <ul class="mb-0">
          ${values.map(value => `<li>${value}</li>`).join('')}
        </ul>
      </div>`;
    }

    structuredInfo.innerHTML = html;
  }

  // Copy button functionality
  copyBtn.addEventListener('click', function() {
    const textToCopy = extractedText.textContent;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text. Please try again.');
      });
  });
});
