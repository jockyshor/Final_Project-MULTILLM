import type { Request, Response } from 'express';
import { DocumentService } from '../services/document.service.js';

export class DocumentController {
  static async upload(req: Request, res: Response) {
    try {
      const { filename, base64Content, fileType } = req.body;
      if (!filename || !base64Content) {
        res.status(400).json({ error: 'Filename and base64Content are required.' });
        return;
      }

      const result = await DocumentService.processAndIndex(filename, base64Content, fileType);
      res.json({
        status: 'success',
        message: `Document "${filename}" parsed and indexed into Neon pgvector.`,
        details: result,
      });
    } catch (err: any) {
      console.error('Failed to ingest document:', err);
      res.status(500).json({ error: `RAG ingestion failed: ${err.message}` });
    }
  }
}