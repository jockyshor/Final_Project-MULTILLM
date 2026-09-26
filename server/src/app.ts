import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.use(cors({ origin: ENV.CORS_ORIGIN }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(requestLogger);

// Montaje de rutas modularizadas bajo el prefijo /api
app.use('/api', apiRouter);

// Manejador centralizado de errores
app.use(errorHandler);