import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL in server/.env');
}

export const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

// Ensure pgvector extension is enabled in Neon PostgreSQL
sql`CREATE EXTENSION IF NOT EXISTS vector;`
  .then(() => console.log('✅ [Neon PostgreSQL] pgvector extension verified.'))
  .catch((err) => console.warn('⚠️ [Neon PostgreSQL] pgvector check notice:', err.message));
  