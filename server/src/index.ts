import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { streamText, generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { conversations, messages as messagesTable } from './db/schema.js';
import { projectTools } from './mcp/tools.js';
import { ingestDocument } from './rag/index.js';

// 🛡️ Node ESM Bridge for CommonJS Binary Parsers (pdf-parse & mammoth)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

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

// ACTIVE MULTI-PROVIDER MODEL REGISTRY
const MODELS = {
  GROQ_FAST: 'openai/gpt-oss-20b',          // Provider: Groq (Ultra-fast 20B LPU for chat & triage)
  GROQ_REASONING: 'openai/gpt-oss-120b',     // Provider: Groq (Heavyweight 120B for Tools & Reasoning)
  GEMINI_RESEARCH: 'gemini-flash-lite-latest',       // Provider: Google (Deep analysis & 1M context)
} as const;

// 3. MIDDLEWARE & CORS (With 25MB Body Limit for Base64 PDF/DOCX Ingestion)
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 4. OPERATIONAL HEALTH PROBE
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      models: [MODELS.GROQ_FAST, MODELS.GROQ_REASONING, MODELS.GEMINI_RESEARCH],
    });
  } catch (err: any) {
    console.error('Health check failed:', err);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// 5. REST ENDPOINTS FOR HISTORY HYDRATION (With Sleep/Wake Resilience)
app.get('/api/conversations', async (req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(25);
    res.json(list);
  } catch (err: any) {
    console.warn(`⚠️ [DB Notice] Connection retry needed: ${err.message}`);
    res.json([]);
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

// 6. MULTI-FORMAT DOCUMENT RAG INGESTION API (.pdf, .docx, .md, .txt, .json)
app.post('/api/documents/upload', async (req: Request, res: Response) => {
  try {
    const { filename, base64Content, fileType } = req.body;
    if (!filename || !base64Content) {
      res.status(400).json({ error: 'Filename and base64Content are required.' });
      return;
    }

    const buffer = Buffer.from(base64Content, 'base64');
    let extractedText = '';

    const lowerFilename = filename.toLowerCase();

    // 📄 Format 1: PDF Binary Extraction
    if (lowerFilename.endsWith('.pdf')) {
      console.log(`📑 [RAG Parser] Extracting text from PDF: "${filename}"`);
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } 
    // 📝 Format 2: Word DOCX Binary Extraction
    else if (lowerFilename.endsWith('.docx')) {
      console.log(`📝 [RAG Parser] Extracting text from DOCX: "${filename}"`);
      const docxResult = await mammoth.extractRawText({ buffer });
      extractedText = docxResult.value;
    } 
    // 📃 Format 3: Plain Text, Markdown, JSON
    else {
      extractedText = buffer.toString('utf-8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      res.status(400).json({ error: 'Could not extract any readable text from this file.' });
      return;
    }

    // Ingest extracted plain text into Neon pgvector chunking pipeline
    const result = await ingestDocument(filename, extractedText, fileType);

    res.json({
      status: 'success',
      message: `Document "${filename}" parsed and indexed into Neon pgvector.`,
      details: result,
    });
  } catch (err: any) {
    console.error('Failed to ingest document:', err);
    res.status(500).json({ error: `RAG ingestion failed: ${err.message}` });
  }
});

// 7. MULTI-PROVIDER SUPERVISORY ORCHESTRATOR & UNBOUNDED ReAct AGENT
app.post('/api/chat', async (req: Request, res: Response) => {
  let activeConversationId: string = req.body.conversationId || (req.headers['x-conversation-id'] as string);

  try {
    const { messages } = req.body;
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Step A: Thread Auto-Healing & Deduplication
    if (!activeConversationId && messages.length > 1) {
      const firstUserMsg = messages.find((m: any) => m.role === 'user')?.content;
      if (firstUserMsg) {
        const [matchedThread] = await db
          .select({ conversationId: messagesTable.conversationId })
          .from(messagesTable)
          .where(eq(messagesTable.content, firstUserMsg))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);

        if (matchedThread) {
          activeConversationId = matchedThread.conversationId;
          console.log(`🔗 [Thread Auto-Heal] Re-attached turn to ongoing Thread ${activeConversationId}`);
        }
      }
    }

    // Initialize thread in Postgres if legitimately Turn 1
    if (!activeConversationId) {
      let semanticTitle = lastUserMessage.slice(0, 30);
      try {
        const { text: titleGen } = await generateText({
          model: groq(MODELS.GROQ_FAST),
          prompt: `Summarize this user prompt into a clean, concise 2 to 4 word topic title (e.g. "React 19 Hooks", "Tokyo Live Weather", "Node Release", "DIY Gel Nails"). Return ONLY the words, no quotes, no punctuation: "${lastUserMessage}"`,
          temperature: 0,
        });
        if (titleGen && titleGen.trim().length > 0) {
          semanticTitle = titleGen.replace(/["'“”.]/g, '').trim().slice(0, 45);
        }
      } catch {
        semanticTitle = lastUserMessage.slice(0, 30);
      }

      const [newConv] = await db
        .insert(conversations)
        .values({
          title: semanticTitle,
        })
        .returning();

      if (!newConv) {
        throw new Error('Failed to initialize conversation in database.');
      }

      activeConversationId = newConv.id;
      console.log(`🆕 [New Thread Created] "${semanticTitle}" (ID: ${activeConversationId})`);
    }

    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: 'user',
      content: lastUserMessage,
    });

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 🛡️ CONTEXT DISTILLATION: Slices last 6 turns, truncates oversized historical payloads
    const conversationMessages: any[] = messages
      .slice(-6)
      .map((m: any) => ({
        role: m.role,
        content:
          typeof m.content === 'string' && m.content.length > 1200
            ? m.content.slice(0, 1200) + '... [Historical context truncated]'
            : m.content,
      }));

    // Dynamic Tool Catalog Generation
    const dynamicToolCatalog = Object.entries(projectTools)
      .map(([name, toolDef]: [string, any]) => `- ${name}: ${toolDef.description || 'Utility tool'}`)
      .join('\n');

    // =========================================================================
    // 🧠 STAGE 1: MULTI-PROVIDER SUPERVISOR (UNIVERSAL KNOWLEDGE BOUNDARY)
    // =========================================================================
    const supervisorStart = Date.now();

    const recentContext = messages
      .slice(-4)
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const supervisorPrompt = `You are the Lead Systems Orchestrator for a multi-provider AI platform.
Current Reference Date: ${currentDate}. You operate with full temporal awareness.

Analyze the user's latest query in conversational context and select the optimal model tier, tool policy, and search query:

AVAILABLE MULTI-PROVIDER TIERS:
- "REASONING" [Groq: ${MODELS.GROQ_REASONING}]: Heavy 120B model. REQUIRED for all factual verification, real-world events, software versions, leaders, company news, awards, sports, codebase analysis, uploaded document RAG, and multi-step tool execution.
- "RESEARCH" [Google: ${MODELS.GEMINI_RESEARCH}]: Google Gemini. Best for deep comparative essays, historical analysis, multi-perspective synthesis, or creative writing.
- "FAST" [Groq: ${MODELS.GROQ_FAST}]: 20B model. Reserved ONLY for static conceptual explanations (math, algorithms, philosophy), code generation from first principles, how-to tutorials, recipes, or casual non-tool chat ("hi").

AVAILABLE TOOLS:
${dynamicToolCatalog}

DECISION RULES:
DECISION RULES:
1. For ANY query touching volatile real-world facts, live weather, sports, uploaded documents, or codebase files: set "modelTier" to "REASONING" and "needsTools" to TRUE.
2. For deep comparative essays, historical analysis, philosophy, or creative writing: set "modelTier" to "RESEARCH" and "needsTools" to FALSE (pure synthesis, no tools needed).
3. Set "modelTier" to "FAST" and "needsTools" to FALSE for simple tutorials, recipes, or casual chat.

Respond ONLY with raw JSON (no markdown, no backticks):
{"modelTier": "FAST" | "REASONING" | "RESEARCH", "needsTools": boolean, "contextualQuery": "self-contained search phrase", "reasoning": "1-sentence explanation"}`;

    let decision = {
      modelTier: 'REASONING',
      needsTools: true,
      contextualQuery: lastUserMessage,
      reasoning: 'Default to verified reasoning',
    };
    let supervisorLatency = 50;

    try {
      const { text: supervisorRaw } = await generateText({
        model: groq(MODELS.GROQ_FAST),
        system: supervisorPrompt,
        prompt: `CONVERSATION CONTEXT:\n${recentContext}\n\nLATEST QUERY: "${lastUserMessage}"\n\nDISPATCH JSON:`,
        temperature: 0,
      });

      supervisorLatency = Date.now() - supervisorStart;
      const sanitized = supervisorRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      decision = JSON.parse(sanitized);
    } catch {
      const queryLower = lastUserMessage.toLowerCase();
      const isFactual =
        queryLower.includes('who') ||
        queryLower.includes('won') ||
        queryLower.includes('weather') ||
        queryLower.includes('code') ||
        queryLower.includes('document') ||
        queryLower.includes('latest') ||
        queryLower.includes('current') ||
        queryLower.includes('version') ||
        queryLower.includes('file');
      decision = {
        modelTier: isFactual ? 'REASONING' : 'FAST',
        needsTools: isFactual,
        contextualQuery: lastUserMessage,
        reasoning: 'Heuristic fallback applied',
      };
    }

    let selectedModel: any;
    if (decision.modelTier === 'REASONING') {
      selectedModel = groq(MODELS.GROQ_REASONING);
    } else if (decision.modelTier === 'RESEARCH') {
      // 🛡️ PROVIDER CHECK: If Google API key is missing or blinks, route to Groq 120B
      const hasGoogleKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      selectedModel = hasGoogleKey ? gemini(MODELS.GEMINI_RESEARCH) : groq(MODELS.GROQ_REASONING);
    } else {
      selectedModel = groq(MODELS.GROQ_FAST);
    }

    const needsTools = Boolean(decision.needsTools);
    const routingReason = `Supervisor [${decision.modelTier}]: ${decision.reasoning} (${supervisorLatency}ms)`;

    console.log(
      `📡 [Supervisor] Thread ${activeConversationId} -> ${selectedModel.modelId} (Tools: ${
        needsTools ? 'ON' : 'OFF'
      } | Query: "${decision.contextualQuery}")`
    );

    const streamStart = Date.now();
    const executedTools: Array<{ toolName: string; args: any }> = [];

    // =========================================================================
    // 🤖 STAGE 2: HIGH-CEILING AUTONOMOUS ReAct AGENT LOOP (MODEL-DRIVEN)
    // =========================================================================
    if (needsTools) {
      const MAX_AGENT_STEPS = 5;
      let currentStep = 0;
      let agentNeedsMoreTools = true;
      const executedToolSignatures = new Set<string>();

      try {
        while (agentNeedsMoreTools && currentStep < MAX_AGENT_STEPS) {
          currentStep++;
          console.log(`🔄 [ReAct Cycle] Step ${currentStep} of ${MAX_AGENT_STEPS}`);

          // 🛡️ UNIVERSAL EPISTEMIC BOUNDARY: Forces tool verification without JS hacks
          const agentEvaluationPrompt = `You are a versatile Senior AI Specialist and Autonomous Agent.
Date Reference: ${currentDate}. You operate with full temporal awareness.
Available Tools:
${dynamicToolCatalog}

EPISTEMIC BOUNDARY & VERIFICATION POLICY:
- TIME-SENSITIVE KNOWLEDGE MANDATE: Your pre-trained neural weights have a fixed training cutoff and are strictly FROZEN. They are considered UNTRUSTED for any real-world factual, temporal, or volatile data.
- Scope of Mandatory Tool Use: If the query asks about current events, software versions/releases, election results, corporate news, award/tournament outcomes, live weather, codebase files, or uploaded documents: You are STRICTLY PROHIBITED from answering from pre-trained memory. You MUST invoke the appropriate tool to verify ground truth.
- Target Search Strategy: Use the Supervisor's pre-formulated query ("${decision.contextualQuery || lastUserMessage}") or construct a clean, entity-specific search with relevant years/identifiers.
- Autonomous Multi-Hop: If initial findings provide partial details, execute a targeted follow-up query autonomously.
- Conclude only after verified tool evidence has been retrieved.`;

          const toolCheck = await generateText({
            model: selectedModel,
            system: agentEvaluationPrompt,
            messages: conversationMessages,
            tools: projectTools,
            temperature: 0,
          });

          // 🛡️ Type-safe mutable tool list honoring Vercel AI SDK immutability
          let activeToolCalls: any[] = [...(toolCheck.toolCalls || [])];

          // 🛡️ MODEL-DRIVEN AUTONOMY: If model emits 0 tool calls, respect its reasoning and do not inject fake tool calls
          if (activeToolCalls.length === 0) {
            console.log(
              currentStep === 1
                ? `ℹ️ [ReAct Cycle] Model determined no external tools were required on Step 1. Proceeding to direct synthesis.`
                : `✅ [ReAct Cycle] Agent satisfied with gathered evidence at Step ${currentStep}. Proceeding to synthesis.`
            );
            agentNeedsMoreTools = false;
            break;
          }

          for (const call of activeToolCalls) {
            let toolName = call.toolName;
            let toolArgs = (call as any).args ?? {};

            if (typeof toolArgs === 'string') {
              try {
                toolArgs = JSON.parse(toolArgs);
              } catch {
                // keep raw string
              }
            }

            // Defensive Alias Mapping to browse_web
            if (toolName === 'weather' || toolName === 'getWeather') toolName = 'get_weather';
            if (
              toolName === 'web_search' ||
              toolName === 'search' ||
              toolName === 'google_search' ||
              toolName === 'search_web' ||
              toolName === 'lookup_wikipedia'
            ) {
              toolName = 'browse_web';
            }

            // Contextual Search Query Fallback
            if (toolName === 'browse_web') {
              const currentQuery = toolArgs.query || toolArgs.topic || '';
              if (!currentQuery || currentQuery === lastUserMessage) {
                toolArgs.query = decision.contextualQuery || lastUserMessage;
              }
            }

            // Clean Parameter Fallbacks
            if (toolName === 'get_weather' && (!toolArgs.city && !toolArgs.location)) {
              const cityMatch =
                lastUserMessage.match(/(?:in|for|at|of)\s+([A-Za-z\s]+?)(?:\s+(?:today|tomorrow|now|right now|\?|$))/i) ||
                lastUserMessage.match(/weather\s+(?:in\s+)?([A-Za-z\s]+)/i);
              toolArgs = { city: cityMatch?.[1]?.trim() || lastUserMessage.replace(/weather/i, '').trim() };
            }
            if (toolName === 'search_documents' && !toolArgs.query) {
              toolArgs = { query: lastUserMessage.replace(/["'“”?]/g, '').trim() };
            }

            // Deduplication Guard: Break immediately if model repeats the exact same query
            const callSignature = `${toolName}:${JSON.stringify(toolArgs)}`;
            if (executedToolSignatures.has(callSignature)) {
              console.log(`⏹️ [ReAct Dedup] Duplicate tool call detected (${toolName}). Breaking loop to prevent thrashing.`);
              agentNeedsMoreTools = false;
              break;
            }
            executedToolSignatures.add(callSignature);

            executedTools.push({ toolName, args: toolArgs });
            console.log(`🔧 [Step ${currentStep} Tool Action] ${toolName}`, toolArgs);

            const toolHandler = (projectTools as any)[toolName];
            if (toolHandler && typeof toolHandler.execute === 'function') {
              const toolResult = await toolHandler.execute(toolArgs);

              conversationMessages.push({
                role: 'assistant',
                content: `[Executed tool ${toolName} with arguments: ${JSON.stringify(toolArgs)}]`,
              });

              // Minified JSON saves ~40% token overhead
              conversationMessages.push({
                role: 'user',
                content: `Tool findings for ${toolName}:\n\`\`\`json\n${JSON.stringify(
                  toolResult
                )}\n\`\`\`\nEvaluate these findings. If you need another tool or more specific search keywords to answer the user's question, call it now. Otherwise, conclude.`,
              });
            } else {
              console.warn(`⚠️ Tool "${toolName}" not registered.`);
            }
          }
        }
      } catch (toolError: any) {
        console.warn(`⚠️ [ReAct Recovery] Tool loop issue: ${toolError.message}. Proceeding to synthesis.`);
      }

      // Synthesis closure: explicit instruction so the model does not call tools during streamText
      conversationMessages.push({
        role: 'user',
        content: `All tool findings have been collected. Please deliver your final, comprehensive response now based on the findings above. Do NOT attempt to invoke any more tools. Output clean Markdown only.`,
      });
    }

    // =========================================================================
    // 🚀 STAGE 3: SYNTHESIZE & STREAM GROUNDED ANSWER (DUAL PROMPT PATTERN)
    // =========================================================================
    // 🛡️ DUAL PROMPT: If tools were OFF, use a pure conversational prompt with ZERO tool mentions!
    const cleanConversationalPrompt = `You are a helpful, versatile Senior AI Assistant.
Deliver a direct, detailed, and beautifully structured response in clean Markdown.
Be encouraging, clear, and actionable.`;

    const toolGroundedSynthesisPrompt = `You are a helpful, versatile Senior AI Assistant.
Date Reference: ${currentDate}.
Deliver a direct, comprehensive, and factually accurate answer grounded in the real tool findings above.

Chronological & Grounding Rules:
- Fact Grounding: Ground all real-world facts, outcomes, figures, versions, and dates strictly in the tool findings above.
- Document Findings: If search_documents findings are present, summarize the exact facts and cite the source document name.
- Calendar Arithmetic: Any event date earlier than ${currentDate} has ALREADY occurred in the past.
- Live Web & Documents: Synthesize findings directly and cite sources with clickable Markdown links: [Source Title](URL).
- Do NOT call any tools. Output clean Markdown only.`;

    const activeSystemPrompt = needsTools ? toolGroundedSynthesisPrompt : cleanConversationalPrompt;

    const result = streamText({
      model: selectedModel,
      system: activeSystemPrompt,
      messages: conversationMessages,
      maxOutputTokens: 2500,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');
    res.setHeader('x-conversation-id', activeConversationId);

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
      `💾 [DB Commit] Saving turn to Thread ${activeConversationId} (${totalTokens} tokens | ${totalLatency}ms | ${executedTools.length} tools executed)`
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
  } catch (error: any) {
    console.error('CRITICAL ROUTE ERROR (Self-Healing Fallback Triggered):', error);

    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('x-vercel-ai-data-stream', 'v1');
      if (activeConversationId) {
        res.setHeader('x-conversation-id', activeConversationId);
      }
    }

    const gracefulMessage =
      "I encountered a momentary connection issue with the external provider. Please try asking your question again in a moment.";
    res.write(`0:${JSON.stringify(gracefulMessage)}\n`);
    res.end();
  }
});

// 8. START SERVER
app.listen(PORT, () => {
  console.log(`🚀 MULTILLM Core active on port ${PORT}`);
});