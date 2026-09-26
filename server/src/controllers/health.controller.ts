import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { MODELS } from '../config/env.js';

export class HealthController {
  static async check(req: Request, res: Response) {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        models: [MODELS.GROQ_FAST, MODELS.GROQ_REASONING, MODELS.GEMINI_RESEARCH],
      });
    } catch (err: any) {
      console.error('Health check failed:', err);
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: err.message,
      });
    }
  }
}