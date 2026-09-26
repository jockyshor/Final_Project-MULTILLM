import * as dotenv from 'dotenv';
dotenv.config();

const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  throw new Error('Missing GROQ_API_KEY in server/.env');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL in server/.env');
}

export const ENV = {
  PORT: process.env.PORT || 5001,
  GROQ_API_KEY: groqKey,
  GOOGLE_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  DATABASE_URL: databaseUrl,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;

export const MODELS = {
  GROQ_FAST: 'openai/gpt-oss-20b',
  GROQ_REASONING: 'openai/gpt-oss-120b',
  GEMINI_RESEARCH: 'gemini-flash-lite-latest',
} as const;