import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// 1. CONVERSATIONS TABLE
export const conversations = pgTable('conversations', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').default('New Conversation').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
// 2. MESSAGES TABLE
export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
        .references(() => conversations.id, { onDelete: 'cascade' })
        .notNull(),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    // Telemetry & Observability (populated on assistant turns)
    model: text('model'),
    routingReason: text('routing_reason'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 3. RELATIONS (Enables easy joins in Drizzle)
export const conversationsRelations = relations(conversations, ({ many }) => ({
    messages: many(messages),
}));
export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
}));
//# sourceMappingURL=schema.js.map