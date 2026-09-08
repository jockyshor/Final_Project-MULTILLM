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

// 2. DEFENSIVE PROVIDER INITIALIZATION (August 2026 Strict Mode)
const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  throw new Error("Missing GROQ_API_KEY in server/.env");
}

const groq = createGroq({
  apiKey: groqKey, // Narrowed to 'string' for TS 7.0
});

const gemini = google; // Standard Google provider

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
    let selectedModel;
    let systemPrompt;

    if (query.includes('code') || query.includes('typescript')) {
      selectedModel = groq('llama-3.3-70b-versatile');
      systemPrompt = "You are a Senior Software Architect. Provide clean, secure, and modern code.";
    } else if (query.includes('image') || query.includes('visual')) {
      selectedModel = gemini('gemini-1.5-flash');
      systemPrompt = "You are a Multimodal Expert. Analyze images and visual patterns.";
    } else {
      selectedModel = groq('llama-3.3-8b-instant');
      systemPrompt = "You are a concise AI assistant optimized for speed.";
    }

    console.log(`📡 [2026 Router] Routing to: ${selectedModel.modelId}`);

    // 5. INITIATE STREAM
    const result = await streamText({
      model: selectedModel,
      system: systemPrompt,
      messages,
    });

    /**
     * SENIOR 2026 STREAM BRIDGE
     * We attempt the standard pipe helper first. 
     * If TS 7.0 complains about the type, we use (as any) because 
     * the runtime object in v7.0.93 still contains the protocol methods.
     */
    try {
      // Set the protocol headers required by React 'useChat'
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('x-vercel-ai-data-stream', 'v1');

      // Attempt the direct pipe
      (result as any).pipeDataStreamToResponse(res);
      
    } catch (streamError) {
      console.warn("Standard pipe failed, using manual Web Stream reader...");
      
      // Fallback: Manual ReadableStream -> Express Writable
      const reader = (result as any).fullStream?.getReader();
      if (!reader) throw new Error("No streamable content found on result.");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Convert protocol objects to strings if necessary
        const chunk = typeof value === 'string' ? value : JSON.stringify(value) + '\n';
        res.write(chunk);
      }
      res.end();
    }

  } catch (error) {
    console.error('CRITICAL ROUTE ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Orchestration layer failure.' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MULTILLM 2026 Core active on port ${PORT}`);
});


