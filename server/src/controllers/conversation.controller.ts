import type { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service.js';

export class ConversationController {
  static async list(req: Request, res: Response) {
    try {
      const list = await ConversationService.listRecent();
      res.json(list);
    } catch (err: any) {
      console.warn(`⚠️ [DB Notice] Connection retry needed: ${err.message}`);
      res.json([]);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Valid conversation ID is required' });
        return;
      }

      const history = await ConversationService.getHistory(id);
      res.json(history);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
      res.status(500).json({ error: 'Failed to retrieve conversation history' });
    }
  }
}