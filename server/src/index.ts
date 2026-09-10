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
  throw new Error('Missing GROQ_API_KEY in server/.env');
}

const groq = createGroq({ apiKey: groqKey });
const gemini = google;

// VERIFIED LIVE MODEL REGISTRY
const MODELS = {
  GROQ_FAST: 'openai/gpt-oss-20b',          // Fast 20B Specialist & Sub-100ms Supervisor
  GROQ_REASONING: 'openai/gpt-oss-120b',     // Heavy 120B Reasoning Specialist & Complex Agent
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

// 5. EXTENSIBLE SUPERVISORY ORCHESTRATOR & DYNAMIC AGENT ENGINE
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, conversationId: clientConversationId } = req.body;
    const lastUserMessage = messages[messages.length - 1]?.content || '';

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
        throw new Error('Failed to initialize conversation in database.');
      }

      activeConversationId = newConv.id;
    }

    // Step B: Persist incoming user message
    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: 'user',
      content: lastUserMessage,
    });

    // Step C: Dynamically Discover Registered Tools for Zero-Touch Extensibility
    const availableToolNames = Object.keys(projectTools);
    const dynamicToolCatalog = Object.entries(projectTools)
      .map(([name, toolDef]: [string, any]) => `- ${name}: ${toolDef.description || 'Utility tool'}`)
      .join('\n');

    // =========================================================================
    // 🧠 STAGE 1: THE SUPERVISORY ORCHESTRATOR (Context-Aware Meta-Controller)
    // =========================================================================
    const supervisorStart = Date.now();

    // Contextual window: evaluate the last 4 turns for conversational depth
    const recentContext = messages
      .slice(-4)
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const supervisorPrompt = `You are the Lead Systems Orchestrator for an autonomous AI platform.
Analyze the user's latest query within the conversational context and determine the ideal model tier and tool strategy.

AVAILABLE MODEL TIERS:
- "REASONING" (${MODELS.GROQ_REASONING}): Heavy 120B reasoning model. Reserved for multi-file codebase analysis, software architecture, complex debugging, deep deductive logic, or high-ambiguity technical problem solving.
- "FAST" (${MODELS.GROQ_FAST}): Sub-100ms 20B model. Highly capable for quick factual answers, real-time web search, weather queries, single-file lookups, casual conversation, summaries, and general guidance.

ACTIVE EXTENSIBLE TOOL SUITE:
${dynamicToolCatalog}

DECISION POLICY:
1. Set "needsTools" to TRUE if the request requires real-world data, external facts, live metrics, or local project inspection.
2. Set "needsTools" to FALSE for casual banter, conceptual advice, writing, math, or basic conversational follow-ups.
3. Choose "REASONING" only when the task demands multi-step deep reasoning or complex coding. Default to "FAST" to conserve latency and token cost.

Respond ONLY with a raw JSON object (no markdown, no backticks):
{"modelTier": "FAST" | "REASONING", "needsTools": boolean, "reasoning": "1-sentence architectural explanation"}`;

    const { text: supervisorRaw } = await generateText({
      model: groq(MODELS.GROQ_FAST),
      system: supervisorPrompt,
      prompt: `CONVERSATION CONTEXT:\n${recentContext}\n\nLATEST QUERY: "${lastUserMessage}"\n\nDISPATCH JSON:`,
      temperature: 0,
    });

    // Defensive JSON Parse with self-healing fallback
    let decision = { modelTier: 'FAST', needsTools: false, reasoning: 'Default fallback' };
    try {
      const sanitized = supervisorRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      decision = JSON.parse(sanitized);
    } catch {
      const isCode = lastUserMessage.toLowerCase().includes('code') || lastUserMessage.toLowerCase().includes('file');
      decision = {
        modelTier: isCode ? 'REASONING' : 'FAST',
        needsTools: isCode || lastUserMessage.toLowerCase().includes('weather') || lastUserMessage.toLowerCase().includes('search'),
        reasoning: 'Heuristic fallback applied due to non-JSON output',
      };
    }

    const supervisorLatency = Date.now() - supervisorStart;

    // Assign the model selected by the Supervisor
    const selectedModel = decision.modelTier === 'REASONING'
      ? groq(MODELS.GROQ_REASONING)
      : groq(MODELS.GROQ_FAST);

    const needsTools = Boolean(decision.needsTools);
    const routingReason = `Supervisor [${decision.modelTier}]: ${decision.reasoning} (${supervisorLatency}ms)`;

    console.log(
      `📡 [Supervisor] Thread ${activeConversationId} -> ${selectedModel.modelId} (Tools: ${
        needsTools ? 'ON' : 'OFF'
      }) | Reason: "${decision.reasoning}"`
    );

    const streamStart = Date.now();
    const executedTools: Array<{ toolName: string; args: any }> = [];
    const conversationMessages: any[] = [...messages];

    // =========================================================================
    // 🤖 STAGE 2: THE SPECIALIST AGENT (Autonomous Tool Selection)
    // =========================================================================
    if (needsTools) {
      const agentEvaluationPrompt = `You are a versatile Senior AI Specialist and Autonomous Agent.
You have direct access to the following extensible tools:
${dynamicToolCatalog}

Analyze the user's request and prior conversational context.
If external data, verified live information, or file content is required to answer accurately, autonomously invoke the single most appropriate tool with precise parameters.
If no external tool is required, proceed directly.`;

      const toolCheck = await generateText({
        model: selectedModel,
        system: agentEvaluationPrompt,
        messages: conversationMessages,
        tools: projectTools, // The complete extensible tool suite
        temperature: 0,
      });

      if (toolCheck.toolCalls && toolCheck.toolCalls.length > 0) {
        for (const call of toolCheck.toolCalls) {
          let toolName = call.toolName;
          let toolArgs = (call as any).args ?? {};

          // Defensive Parsing: normalize arguments if passed as JSON string
          if (typeof toolArgs === 'string') {
            try {
              toolArgs = JSON.parse(toolArgs);
            } catch {
              // keep as raw string
            }
          }

          // Dynamic Generic Alias Resolution
          if (toolName === 'weather' || toolName === 'getWeather') toolName = 'get_weather';
          if (toolName === 'search' || toolName === 'google_search' || toolName === 'webSearch') toolName = 'web_search';

          // Resilient Parameter Fallbacks
          if (toolName === 'read_file' && !toolArgs.filePath) {
            const match = lastUserMessage.match(/[\w\-./]+\.(json|ts|tsx|js|jsx|css|html|md)/i);
            if (match) toolArgs = { filePath: match[0] };
          }
          if (toolName === 'get_weather' && (!toolArgs.city && !toolArgs.location)) {
            const cityMatch =
              lastUserMessage.match(/(?:in|for|at|of)\s+([A-Za-z\s]+?)(?:\s+(?:today|tomorrow|now|right now|\?|$))/i) ||
              lastUserMessage.match(/weather\s+(?:in\s+)?([A-Za-z\s]+)/i);
            toolArgs = { city: cityMatch?.[1]?.trim() || lastUserMessage.replace(/weather/i, '').trim() };
          }
          if (toolName === 'web_search' && (!toolArgs.query || toolArgs.query.trim().length === 0)) {
            toolArgs = { query: lastUserMessage };
          }

          executedTools.push({ toolName, args: toolArgs });
          console.log(`🔧 [Agent Action] Invoking tool: ${toolName}`, toolArgs);

          // Extensible Tool Execution via Registry
          const toolHandler = (projectTools as any)[toolName];
          if (toolHandler && typeof toolHandler.execute === 'function') {
            const toolResult = await toolHandler.execute(toolArgs);

            // Inject the real tool findings into context for Phase 2 synthesis
            conversationMessages.push({
              role: 'assistant',
              content: `[Executed tool ${toolName}]`,
            });
            conversationMessages.push({
              role: 'user',
              content: `Here are the real findings from the tool ${toolName}:\n\`\`\`json\n${JSON.stringify(
                toolResult,
                null,
                2
              )}\n\`\`\`\nPlease answer my original question using these findings. Be concise, clear, and direct.`,
            });
          } else {
            console.warn(`⚠️ [Agent Warning] Tool "${toolName}" was called but is not in projectTools registry.`);
          }
        }
      }
    }

    // =========================================================================
    // 🚀 PHASE 2: SYNTHESIZE & STREAM GROUNDED ANSWER (Zero-Tool Mode)
    // =========================================================================
    const synthesisPrompt = `You are a helpful, versatile Senior AI Assistant.
Answer the user's question directly, clearly, and concisely.
- If real findings from tools (weather metrics, factual records, file contents) are provided in the history, summarize them directly and answer the user's question.
- If the user asks how to do something, provide clean, actionable, step-by-step instructions.
Do NOT attempt to call any further tools. Output clean Markdown only.`;

    const result = streamText({
      model: selectedModel,
      system: synthesisPrompt,
      messages: conversationMessages,
      maxOutputTokens: 700,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');

    let fullAssistantResponse = '';

    for await (const chunk of result.textStream) {
      fullAssistantResponse += chunk;
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    const usage = await result.usage;
    const streamLatency = Date.now() - streamStart;
    const totalLatency = supervisorLatency + streamLatency;

    const inputTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
    const outputTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
    const totalTokens = (usage as any).totalTokens ?? inputTokens + outputTokens;

    console.log(
      `💾 [DB Commit] Saving turn to Thread ${activeConversationId} (${totalTokens} tokens | ${totalLatency}ms)`
    );

    // Persist Assistant Turn & Telemetry to Neon Postgres
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

    // Send metadata frame with tool execution telemetry to UI
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
  console.log(`🚀 MULTILLM Core active on port ${PORT}`);
});
