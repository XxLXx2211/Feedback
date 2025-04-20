# PDF Information Extractor

A web application for extracting information from PDF documents using the LLMWhisperer API.

## Features

- Upload PDF documents
- Extract text and structured information
- View extraction results in a user-friendly interface
- Copy extracted text to clipboard

## Technologies Used

- Node.js and Express for the backend
- HTML, CSS, and JavaScript for the frontend
- LLMWhisperer API for PDF text extraction
- Bootstrap for styling

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd pdf-information-extractor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   LLMWHISPERER_API_KEY=your_api_key_here
   LLMWHISPERER_BASE_URL_V2=https://llmwhisperer-api.us-central.unstract.com/api/v2
   ```
   Replace `your_api_key_here` with your actual LLMWhisperer API key.

## Usage

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Upload a PDF file and view the extracted information

## API Endpoints

- `POST /api/pdf/upload`: Upload and process a PDF file
- `GET /api/pdf/status/:whisperHash`: Check the status of PDF processing
- `GET /api/pdf/retrieve/:whisperHash`: Retrieve processed PDF text

## License

MIT
