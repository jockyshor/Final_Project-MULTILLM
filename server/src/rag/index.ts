import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { sql, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { documents, documentChunks } from '../db/schema.js';

/**
 * Splits raw document text into overlapping chunks to preserve semantic context.
 */
export function chunkText(text: string, chunkSize = 500, overlap = 60): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + chunkSize;

    // Try to break on sentence boundary or newline if possible
    if (endIndex < clean.length) {
      const boundary = clean.lastIndexOf('\n', endIndex);
      if (boundary > startIndex + chunkSize / 2) {
        endIndex = boundary;
      }
    }

    const chunk = clean.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex - overlap;
  }

  return chunks;
}

/**
 * Ingests a text or markdown document: chunks it, generates vector embeddings,
 * and persists both document metadata and vector chunks in Neon PostgreSQL.
 */
export async function ingestDocument(filename: string, content: string, fileType = 'text/plain') {
  console.log(`📄 [RAG Ingestion] Processing document "${filename}" (${content.length} chars)...`);

  // Step A: Create parent document record
  const [doc] = await db
    .insert(documents)
    .values({
      filename,
      fileType,
    })
    .returning();

  if (!doc) {
    throw new Error('Failed to create document record in database.');
  }

  // Step B: Chunk document
  const rawChunks = chunkText(content);
  console.log(`🧩 [RAG Chunking] Sliced into ${rawChunks.length} overlapping chunks.`);

  // Step C: Generate 768-dimensional embeddings via Google text-embedding-004
  const { embeddings } = await embedMany({
    model: google.textEmbeddingModel('text-embedding-004'),
    values: rawChunks,
  });

  // Step D: Insert chunks and vectors into Neon pgvector table
  const chunkRows = rawChunks.map((chunk, index) => ({
    documentId: doc.id,
    content: chunk,
    chunkIndex: index,
    embedding: embeddings[index],
  }));

  await db.insert(documentChunks).values(chunkRows);
  console.log(`✅ [RAG Ingestion] Successfully stored ${chunkRows.length} vector chunks in Neon pgvector.`);

  return {
    documentId: doc.id,
    filename,
    chunksCount: chunkRows.length,
  };
}

/**
 * Performs Cosine Similarity search directly inside Neon PostgreSQL
 * using the pgvector `<=>` distance operator.
 */
export async function searchSimilarChunks(query: string, topK = 3) {
  console.log(`🔍 [RAG Search] Generating query embedding for: "${query}"`);

  // Generate 768-dim embedding for user query
  const { embedding: queryEmbedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: query,
  });

  // Convert array to pgvector string format: '[0.012,-0.034,...]'
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Cosine similarity = 1 - Cosine distance (<=>)
  const similarityScore = sql<number>`1 - (${documentChunks.embedding} <=> ${vectorStr}::vector)`;

  const results = await db
    .select({
      chunkId: documentChunks.id,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      similarity: similarityScore,
      filename: documents.filename,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .orderBy(desc(similarityScore))
    .limit(topK);

  console.log(`✅ [RAG Search] Found ${results.length} relevant document chunks in Neon.`);
  return results;
}