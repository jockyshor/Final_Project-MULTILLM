import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
import { ingestDocument } from '../rag/index.js';

export class DocumentService {
  static async processAndIndex(filename: string, base64Content: string, fileType?: string) {
    const buffer = Buffer.from(base64Content, 'base64');
    let extractedText = '';
    const lowerFilename = filename.toLowerCase();

    // 📄 Format 1: PDF Binary Extraction
    if (lowerFilename.endsWith('.pdf')) {
      console.log(`📑 [RAG Parser] Extracting text from PDF: "${filename}"`);
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    }
    // 📝 Format 2: Word DOCX Binary Extraction
    else if (lowerFilename.endsWith('.docx')) {
      console.log(`📝 [RAG Parser] Extracting text from DOCX: "${filename}"`);
      const docxResult = await mammoth.extractRawText({ buffer });
      extractedText = docxResult.value;
    }
    // 📃 Format 3: Plain Text, Markdown, JSON
    else {
      extractedText = buffer.toString('utf-8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Could not extract any readable text from this file.');
    }

    return ingestDocument(filename, extractedText, fileType);
  }
}   