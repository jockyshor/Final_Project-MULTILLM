import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller.js';

export const conversationRouter = Router();
conversationRouter.get('/conversations', ConversationController.list);
conversationRouter.get('/conversations/:id', ConversationController.getById);