import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL as string);

async function run() {
  console.log('⏳ Enabling pgvector in Neon PostgreSQL...');
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log('✅ pgvector extension successfully enabled in Neon PostgreSQL!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to enable pgvector:', err);
  process.exit(1);
});

