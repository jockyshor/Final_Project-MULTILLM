import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';

export const chatRouter = Router();
chatRouter.post('/chat', ChatController.handleChat);