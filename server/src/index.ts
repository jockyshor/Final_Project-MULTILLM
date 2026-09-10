import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { streamText, generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { eq, desc } from 'drizzle-orm';
import { db } from './db/index.js';
import { conversations, messages as messagesTable } from './db/schema.js';

// 1. CONFIGURATION
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// 2. DEFENSIVE PROVIDER INITIALIZATION
const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  throw new Error("Missing GROQ_API_KEY in server/.env");
}

const groq = createGroq({ apiKey: groqKey });
const gemini = google;

// VERIFIED LIVE MODEL REGISTRY
const MODELS = {
  GROQ_FAST: 'openai/gpt-oss-20b',          // Fast 20B Specialist & Router
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

// 4. REST ENDPOINTS FOR HISTORY HYDRATION

// GET /api/conversations - List all recent conversations
app.get('/api/conversations', async (req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(20);
    res.json(list);
  } catch (err) {
    console.error('Failed to list conversations:', err);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// GET /api/conversations/:id - Load full message history of a conversation
app.get('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Strict type narrowing for Express params
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Valid conversation ID is required' });
      return;
    }

    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json(history);
  } catch (err) {
    console.error('Failed to load conversation history:', err);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// 5. THE AI ROUTER WITH PERSISTENCE & CONCISE SYSTEM PROMPTS
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, conversationId: clientConversationId } = req.body;
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Step A: Ensure conversation thread exists in PostgreSQL
    let activeConversationId: string = clientConversationId;

    if (!activeConversationId) {
      const [newConv] = await db
        .insert(conversations)
        .values({
          title: lastUserMessage.slice(0, 45) + (lastUserMessage.length > 45 ? '...' : ''),
        })
        .returning();

      if (!newConv) {
        throw new Error("Failed to initialize conversation in database.");
      }

      activeConversationId = newConv.id;
    }

    // Step B: Persist incoming user message
    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: 'user',
      content: lastUserMessage,
    });

    // Step C: Fast Semantic Intent Classification (~60ms via Groq)
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
      temperature: 0,
    });

    const detectedIntent = intentResponse.trim().toUpperCase();
    const classificationLatency = Date.now() - classificationStart;

    // Step D: Specialist Assignment with Ultra-Concise Rules
    let selectedModel: any;
    let systemPrompt: string;
    let routingReason: string;

    if (detectedIntent.includes('CODE')) {
      selectedModel = groq(MODELS.GROQ_REASONING);
      // Ultra-concise code prompt: No filler, no conversational preambles
      systemPrompt = "You are an expert Software Architect. Return ONLY the clean code with a maximum of 1-2 sentences of explanation. Absolutely NO conversational preambles, no filler, and no verbose introductions. Be ultra-concise.";
      routingReason = `Semantic Classifier: CODE intent (${classificationLatency}ms)`;
    } else if (detectedIntent.includes('VISION')) {
      selectedModel = gemini(MODELS.GEMINI_VISION);
      systemPrompt = "You are a Multimodal Expert. Provide direct, bulleted visual observations. No filler.";
      routingReason = `Semantic Classifier: VISION intent (${classificationLatency}ms)`;
    } else {
      selectedModel = groq(MODELS.GROQ_FAST);
      // Ultra-concise general prompt: Strict 2-3 sentence limit
      systemPrompt = "You are an ultra-concise AI assistant. Provide direct, punchy answers in a MAXIMUM of 2-3 sentences. Cut all polite filler, introductions, and summaries.";
      routingReason = `Semantic Classifier: GENERAL intent (${classificationLatency}ms)`;
    }

    console.log(`📡 [Router] Thread ${activeConversationId} -> ${selectedModel.modelId}`);

    // Step E: Stream with Token Ceiling (prevents verbose runaway completions)
    const streamStart = Date.now();

    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages,
      maxOutputTokens: 400,// 👈 Strict token ceiling: cuts latency by up to 70%
    });

    // Step F: Stream to Express Response & Buffer in Memory
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');

    let fullAssistantResponse = '';

    for await (const chunk of result.textStream) {
      fullAssistantResponse += chunk;
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    // Step G: Collect Telemetry
    const usage = await result.usage;
    const streamLatency = Date.now() - streamStart;
    const totalLatency = classificationLatency + streamLatency;

    const inputTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
    const outputTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
    const totalTokens = (usage as any).totalTokens ?? (inputTokens + outputTokens);

    console.log(`💾 [DB Commit] Saving turn to Thread ${activeConversationId} (${totalTokens} tokens | ${totalLatency}ms)`);

    // Step H: Persist Assistant Turn & Telemetry to Neon
    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: 'assistant',
      content: fullAssistantResponse,
      model: selectedModel.modelId,
      routingReason,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens,
      latencyMs: totalLatency,
    });

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, activeConversationId));

    // Step I: Send Metadata frame back to React UI
    const metadata = {
      conversationId: activeConversationId,
      model: selectedModel.modelId,
      routingReason,
      latencyMs: totalLatency,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
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

// 6. START SERVER
app.listen(PORT, () => {
  console.log(`🚀 MULTILLM 2026 Core active on port ${PORT}`);
});