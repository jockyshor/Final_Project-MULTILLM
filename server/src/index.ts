import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { streamText, generateText } from 'ai';
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


// 4. THE SEMANTIC AI ROUTER
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // ⏱️ Step A: Fast Semantic Intent Classification (~60-100ms via Groq)
    const classificationStart = Date.now();

    const { text: intentResponse } = await generateText({
      model: groq(MODELS.GROQ_FAST),
      system: `You are an intent classification router. 
Analyze the user's latest message in context and classify its primary intent into exactly ONE category:
- CODE: For programming, software design, debugging, algorithms, technical implementation, or code refactoring.
- VISION: For images, diagrams, visual patterns, OCR, or UI mockups.
- GENERAL: For casual conversation, creative writing, summaries, general knowledge, or simple explanations.

Respond with ONLY the category word: CODE, VISION, or GENERAL. Do not explain.`,
      prompt: `Latest message: "${lastUserMessage}"\nClassification:`,
      temperature: 0, // Deterministic
    });

    const detectedIntent = intentResponse.trim().toUpperCase();
    const classificationLatency = Date.now() - classificationStart;

    console.log(`🧠 [Semantic Classifier] Intent: ${detectedIntent} (${classificationLatency}ms)`);

    // 🎯 Step B: Dynamic Specialist Assignment
    let selectedModel: any;
    let systemPrompt: string;
    let routingReason: string;

    if (detectedIntent.includes('CODE')) {
      selectedModel = groq(MODELS.GROQ_REASONING);
      systemPrompt = "You are a Senior Software Architect. Provide robust, clean, and modern code solutions.";
      routingReason = `Semantic Classifier detected CODE intent (${classificationLatency}ms)`;
    } else if (detectedIntent.includes('VISION')) {
      selectedModel = gemini(MODELS.GEMINI_VISION);
      systemPrompt = "You are a Multimodal Expert. Analyze visual structures and patterns.";
      routingReason = `Semantic Classifier detected VISION intent (${classificationLatency}ms)`;
    } else {
      selectedModel = groq(MODELS.GROQ_FAST);
      systemPrompt = "You are a helpful, fast, and concise general AI assistant.";
      routingReason = `Semantic Classifier detected GENERAL intent (${classificationLatency}ms)`;
    }

    console.log(`📡 [Router] Delegating to: ${selectedModel.modelId}`);

    // 🚀 Step C: Stream with Full Conversation Continuity
    const streamStart = Date.now();

    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages, // Passes the entire conversation history to whichever specialist was chosen!
    });

    // 6. DIRECT PROTOCOL STREAM BRIDGE
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');

    for await (const chunk of result.textStream) {
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    // Capture Token Telemetry
    const usage = await result.usage;
    const streamLatency = Date.now() - streamStart;
    const totalLatency = classificationLatency + streamLatency;

    const inputTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
    const outputTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
    const totalTokens = (usage as any).totalTokens ?? (inputTokens + outputTokens);

    console.log(`📊 [Telemetry] Model: ${selectedModel.modelId} | Tokens: ${totalTokens} | Total Latency: ${totalLatency}ms`);

    const metadata = {
      model: selectedModel.modelId,
      routingReason,
      latencyMs: totalLatency,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: totalTokens,
      },
    };

    res.write(`2:[${JSON.stringify(metadata)}]\n`);
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