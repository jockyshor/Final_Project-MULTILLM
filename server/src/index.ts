import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';

// 1. CONFIGURATION
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// 2. DEFENSIVE PROVIDER INITIALIZATION
const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  throw new Error("Missing GROQ_API_KEY in server/.env");
}

const groq = createGroq({
  apiKey: groqKey,
});

const gemini = google;

// VERIFIED LIVE MODEL REGISTRY
const MODELS = {
  GROQ_FAST: 'openai/gpt-oss-20b',          // Fast 20B Specialist
  GROQ_REASONING: 'openai/gpt-oss-120b',     // Heavy 120B Code/Reasoning Specialist
  GEMINI_VISION: 'gemini-1.5-flash',
} as const;

// 3. MIDDLEWARE
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Observability Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 4. THE AI ROUTER
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    const query = (messages[messages.length - 1]?.content || "").toLowerCase();

    // Specialist Selection Logic
    let selectedModel: any;
    let systemPrompt: string;
    let routingReason: string;

    if (query.includes('code') || query.includes('typescript')) {
      selectedModel = groq(MODELS.GROQ_REASONING);
      systemPrompt = "You are a Senior Software Architect. Provide clean, secure, and modern code.";
      routingReason = "Code/Architecture Intent detected (120B Specialist)";
    } else if (query.includes('image') || query.includes('visual')) {
      selectedModel = gemini(MODELS.GEMINI_VISION);
      systemPrompt = "You are a Multimodal Expert. Analyze images and visual patterns.";
      routingReason = "Multimodal Intent detected (Gemini Vision)";
    } else {
      selectedModel = groq(MODELS.GROQ_FAST);
      systemPrompt = "You are a concise AI assistant optimized for speed.";
      routingReason = "General query (Fast 20B Specialist)";
    }

    console.log(`📡 [Router] Routing to: ${selectedModel.modelId} | Reason: ${routingReason}`);

    // 5. INITIATE STREAM & TELEMETRY
    const startTime = Date.now();

    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages,
    });

    // 6. DIRECT PROTOCOL STREAM BRIDGE
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');

    // Stream text chunks to UI
    for await (const chunk of result.textStream) {
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    // Capture token usage safely
    const usage = await result.usage;
    const latencyMs = Date.now() - startTime;

    const inputTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
    const outputTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
    const totalTokens = (usage as any).totalTokens ?? (inputTokens + outputTokens);

    console.log(`📊 [Telemetry] Model: ${selectedModel.modelId} | Total Tokens: ${totalTokens} | Latency: ${latencyMs}ms`);

    // Emit metadata annotation frame to React client
    const metadata = {
      model: selectedModel.modelId,
      routingReason,
      latencyMs,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: totalTokens,
      },
    };

    res.write(`2:[${JSON.stringify(metadata)}]\n`);

    // Cleanly close the HTTP response
    res.end();

  } catch (error) {
    console.error('CRITICAL ROUTE ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Orchestration layer failure.' });
    } else {
      res.end();
    }
  }
});

// 7. START SERVER
app.listen(PORT, () => {
  console.log(`🚀 MULTILLM 2026 Core active on port ${PORT}`);
});