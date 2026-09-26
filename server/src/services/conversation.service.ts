import { eq, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { conversations, messages as messagesTable } from '../models/schema.js';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { ENV, MODELS } from '../config/env.js';

const groq = createGroq({ apiKey: ENV.GROQ_API_KEY });

export class ConversationService {
  static async listRecent() {
    return db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(25);
  }

  static async getHistory(conversationId: string) {
    return db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);
  }

  static async resolveOrCreateThread(
    activeId: string | undefined,
    messages: any[]
  ): Promise<string> {
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Step A: Thread Auto-Healing & Deduplication
    if (!activeId && messages.length > 1) {
      const firstUserMsg = messages.find((m: any) => m.role === 'user')?.content;
      if (firstUserMsg) {
        const [matchedThread] = await db
          .select({ conversationId: messagesTable.conversationId })
          .from(messagesTable)
          .where(eq(messagesTable.content, firstUserMsg))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);

        if (matchedThread) {
          console.log(`🔗 [Thread Auto-Heal] Re-attached turn to ongoing Thread ${matchedThread.conversationId}`);
          return matchedThread.conversationId;
        }
      }
    }

    if (activeId) return activeId;

    // Initialize thread in Postgres if Turn 1
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
      .values({ title: semanticTitle })
      .returning();

    if (!newConv) {
      throw new Error('Failed to initialize conversation in database.');
    }

    console.log(`🆕 [New Thread Created] "${semanticTitle}" (ID: ${newConv.id})`);
    return newConv.id;
  }

  static async saveUserMessage(conversationId: string, content: string) {
    await db.insert(messagesTable).values({
      conversationId,
      role: 'user',
      content,
    });
  }

  static async saveAssistantTurn(
    conversationId: string,
    data: {
      content: string;
      model: string;
      routingReason: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      latencyMs: number;
    }
  ) {
    await db.insert(messagesTable).values({
      conversationId,
      role: 'assistant',
      content: data.content,
      model: data.model,
      routingReason: data.routingReason,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      latencyMs: data.latencyMs,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }
}