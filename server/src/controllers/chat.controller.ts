import type { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service.js';
import { OrchestratorService } from '../services/orchestrator.service.js';
import { isSystemPromptExtraction, SAFETY_REFUSAL_MESSAGE } from '../utils/safety.util.js';
import { projectTools } from '../mcp/tools.js';

export class ChatController {
  static async handleChat(req: Request, res: Response) {
    let activeConversationId: string =
      req.body.conversationId || (req.headers['x-conversation-id'] as string);

    try {
      const { messages } = req.body;
      const lastUserMessage = messages[messages.length - 1]?.content || '';

      activeConversationId = await ConversationService.resolveOrCreateThread(
        activeConversationId,
        messages
      );

      await ConversationService.saveUserMessage(activeConversationId, lastUserMessage);

      // Fast Rejection Guard (Anti-Leak)
      if (isSystemPromptExtraction(lastUserMessage)) {
        console.warn(`🛡️ [Safety Policy] Blocked attempt to extract system prompt on Thread ${activeConversationId}`);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('x-vercel-ai-data-stream', 'v1');
        res.setHeader('x-conversation-id', activeConversationId);

        res.write(`0:${JSON.stringify(SAFETY_REFUSAL_MESSAGE)}\n`);

        await ConversationService.saveAssistantTurn(activeConversationId, {
          content: SAFETY_REFUSAL_MESSAGE,
          model: 'safety-guardrail',
          routingReason: 'Safety Policy: System Prompt Extraction Refused',
          promptTokens: 0,
          completionTokens: SAFETY_REFUSAL_MESSAGE.length,
          totalTokens: SAFETY_REFUSAL_MESSAGE.length,
          latencyMs: 1,
        });

        const safetyMeta = {
          conversationId: activeConversationId,
          model: 'safety-guardrail',
          routingReason: 'Safety Policy: Prompt Protected',
          latencyMs: 1,
          tools: [],
          usage: {
            promptTokens: 0,
            completionTokens: SAFETY_REFUSAL_MESSAGE.length,
            totalTokens: SAFETY_REFUSAL_MESSAGE.length,
          },
        };

        res.write(`2:[${JSON.stringify(safetyMeta)}]\n`);
        res.end();
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const conversationMessages: any[] = messages.slice(-6).map((m: any) => ({
        role: m.role,
        content:
          typeof m.content === 'string' && m.content.length > 1200
            ? m.content.slice(0, 1200) + '... [Historical context truncated]'
            : m.content,
      }));

      const dynamicToolCatalog = Object.entries(projectTools)
        .map(([name, toolDef]: [string, any]) => `- ${name}: ${toolDef.description || 'Utility tool'}`)
        .join('\n');

      const recentContext = messages.slice(-4).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

      // STAGE 1: SUPERVISOR
      const { decision, latency: supervisorLatency, volatile } = await OrchestratorService.runSupervisor(
        lastUserMessage,
        recentContext,
        currentDate,
        dynamicToolCatalog
      );

      const selectedModel = OrchestratorService.selectModel(decision.modelTier);
      const needsTools = Boolean(decision.needsTools);
      const routingReason = `Supervisor [${decision.modelTier}]: ${decision.reasoning} (${supervisorLatency}ms)`;

      console.log(
        `📡 [Supervisor] Thread ${activeConversationId} -> ${selectedModel.modelId} (Tools: ${
          needsTools ? 'ON' : 'OFF'
        } | Query: "${decision.contextualQuery}")`
      );

      // STAGE 2: REACT LOOP
      const streamStart = Date.now();
      let executedTools: Array<{ toolName: string; args: any }> = [];

      if (needsTools) {
        executedTools = await OrchestratorService.executeReActLoop({
          selectedModel,
          conversationMessages,
          decision,
          lastUserMessage,
          currentDate,
          dynamicToolCatalog,
          volatileQuery: volatile,
        });
      }

      // STAGE 3: SYNTHESIS & STREAM
      const result = OrchestratorService.createSynthesisStream({
        selectedModel,
        conversationMessages,
        needsTools,
        currentDate,
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

      await ConversationService.saveAssistantTurn(activeConversationId, {
        content: fullAssistantResponse,
        model: selectedModel.modelId,
        routingReason,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
        latencyMs: totalLatency,
      });

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

      const gracefulMessage = 'I encountered a momentary connection issue with the external provider. Please try asking your question again in a moment.';
      res.write(`0:${JSON.stringify(gracefulMessage)}\n`);
      res.end();
    }
  }
}
