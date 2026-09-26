import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { conversationRouter } from './conversation.routes.js';
import { documentRouter } from './document.routes.js';
import { chatRouter } from './chat.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(conversationRouter);
apiRouter.use(documentRouter);
apiRouter.use(chatRouter);