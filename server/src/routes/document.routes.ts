import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.js';

export const documentRouter = Router();
documentRouter.post('/documents/upload', DocumentController.upload);