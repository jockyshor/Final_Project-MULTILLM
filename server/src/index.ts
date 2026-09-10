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
import { projectTools } from './mcp/tools.js';

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
  GROQ_FAST: 'openai/gpt-oss-20b',
  GROQ_REASONING: 'openai/gpt-oss-120b',
  GEMINI_VISION: 'gemini-1.5-flash',
} as const;

// 3. MIDDLEWARE
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 4. REST ENDPOINTS FOR HISTORY HYDRATION
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

app.get('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

// 5. THE AI ROUTER WITH RE-ACT AGENT TOOL CALLING
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
- CODE: For programming, software design, debugging, repository questions, file inspection, or technical tasks.
- VISION: For images, diagrams, visual patterns, OCR, or UI mockups.
- GENERAL: For casual conversation, creative writing, summaries, or general knowledge.

Respond with ONLY the category word: CODE, VISION, or GENERAL. Do not explain.`,
      prompt: `Latest message: "${lastUserMessage}"\nClassification:`,
      temperature: 0,
    });

    const detectedIntent = intentResponse.trim().toUpperCase();
    const classificationLatency = Date.now() - classificationStart;

    // Step D: Specialist Assignment
    let selectedModel: any;
    let routingReason: string;
    const isCodeSpecialist = detectedIntent.includes('CODE');

    if (isCodeSpecialist) {
      selectedModel = groq(MODELS.GROQ_REASONING);
      routingReason = `Agent Code Specialist: Tools enabled (${classificationLatency}ms)`;
    } else if (detectedIntent.includes('VISION')) {
      selectedModel = gemini(MODELS.GEMINI_VISION);
      routingReason = `Semantic Classifier: VISION intent (${classificationLatency}ms)`;
    } else {
      selectedModel = groq(MODELS.GROQ_FAST);
      routingReason = `Semantic Classifier: GENERAL intent (${classificationLatency}ms)`;
    }

    console.log(`📡 [Router] Thread ${activeConversationId} -> ${selectedModel.modelId} (Tools: ${isCodeSpecialist ? 'ON' : 'OFF'})`);

    const streamStart = Date.now();
    const executedTools: Array<{ toolName: string; args: any }> = [];
    const conversationMessages: any[] = [...messages];

    // =========================================================================
    // 🤖 PHASE 1: AGENT TOOL EVALUATION & EXECUTION (The ReAct Loop)
    // =========================================================================
    if (isCodeSpecialist) {
      const agentEvaluationPrompt = `You are a Senior Software Architect with access to tools (list_directory, read_file).
If the user asks about project files, dependencies, code, or architecture, invoke the read_file or list_directory tool with the appropriate filePath or directoryPath.
Be precise with parameters.`;

      const toolCheck = await generateText({
        model: selectedModel,
        system: agentEvaluationPrompt,
        messages: conversationMessages,
        tools: projectTools,
        temperature: 0,
      });

      if (toolCheck.toolCalls && toolCheck.toolCalls.length > 0) {
        for (const call of toolCheck.toolCalls) {
          const toolName = call.toolName;
          let toolArgs = (call as any).args ?? {};

          // Auto-detect filepath from query if model omitted arguments
          if (toolName === 'read_file' && !toolArgs.filePath) {
            const match = lastUserMessage.match(/[\w\-./]+\.(json|ts|tsx|js|jsx|css|html|md)/i);
            if (match) {
              toolArgs = { filePath: match[0] };
            }
          }

          executedTools.push({ toolName, args: toolArgs });
          console.log(`🔧 [Agent Action] Invoking tool: ${toolName}`, toolArgs);

          const toolHandler = (projectTools as any)[toolName];
          if (toolHandler && typeof toolHandler.execute === 'function') {
            const toolResult = await toolHandler.execute(toolArgs);

            // Inject the real file data from disk into conversation context
            conversationMessages.push({
              role: 'assistant',
              content: `[Inspected disk using tool ${toolName}]`,
            });
            conversationMessages.push({
              role: 'user',
              content: `Here are the real file findings from disk for ${toolName}:\n\`\`\`json\n${JSON.stringify(toolResult, null, 2)}\n\`\`\`\nPlease answer my original question using this data directly. Provide a clear, concise summary.`,
            });
          }
        }
      }
    }

    // =========================================================================
    // 🚀 PHASE 2: SYNTHESIZE & STREAM THE GROUNDED ANSWER (Zero-Tool Mode)
    // =========================================================================
    // Crucial: In Phase 2, explicitly forbid tool calling so Groq streams pure text
    const synthesisPrompt = `You are an expert Software Architect. 
All required file data and codebase context have already been retrieved and provided above.
Directly answer the user's question concisely in 2-3 sentences based on the provided findings.
Do NOT call any tools. Output clean Markdown only.`;

    const result = streamText({
      model: selectedModel,
      system: synthesisPrompt,
      messages: conversationMessages,
      maxOutputTokens: 600,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');

    let fullAssistantResponse = '';

    for await (const chunk of result.textStream) {
      fullAssistantResponse += chunk;
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    console.log("📝 [Streamed Output Length]:", fullAssistantResponse.length, "characters");

    const usage = await result.usage;
    const streamLatency = Date.now() - streamStart;
    const totalLatency = classificationLatency + streamLatency;

    const inputTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
    const outputTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
    const totalTokens = (usage as any).totalTokens ?? (inputTokens + outputTokens);

    console.log(`💾 [DB Commit] Saving turn to Thread ${activeConversationId} (${totalTokens} tokens | ${totalLatency}ms)`);

    // Persist Assistant Turn & Telemetry to Neon
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

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, activeConversationId));

    // Send metadata frame with tool execution history to UI
    const metadata = {
      conversationId: activeConversationId,
      model: selectedModel.modelId,
      routingReason,
      latencyMs: totalLatency,
      tools: executedTools,
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