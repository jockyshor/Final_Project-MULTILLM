import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../models/schema.js';
import { ENV } from './env.js';

export const sql = neon(ENV.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Ensure pgvector extension is enabled in Neon PostgreSQL
sql`CREATE EXTENSION IF NOT EXISTS vector;`
  .then(() => console.log('✅ [Neon PostgreSQL] pgvector extension verified.'))
  .catch((err) => console.warn('⚠️ [Neon PostgreSQL] pgvector check notice:', err.message));