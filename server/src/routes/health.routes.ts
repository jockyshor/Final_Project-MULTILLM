import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

export const healthRouter = Router();
healthRouter.get('/health', HealthController.check);