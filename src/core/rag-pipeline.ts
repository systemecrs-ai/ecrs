/**
 * RAG Pipeline Service (Triple-Retrieval)
 * 
 * Orchestrates the complete Retrieval-Augmented Generation flow:
 *   1. Embed — convert user query to vector via Nvidia embedding model
 *   2. Retrieve — perform PARALLEL vector searches across:
 *      - Products collection
 *      - Documents collection  
 *      - User memory vectors
 *   3. Build — construct system prompt with triple context
 *   4. Generate — stream response via Nvidia chat model
 *   5. Persist — store messages and trigger memory summarization
 * 
 * This module is completely abstracted from HTTP concerns.
 * It receives domain types and returns a Vercel AI SDK StreamTextResult.
 * 
 * @module core/rag-pipeline
 */

import { streamText, rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';
import { getEmbedding, getChatModel } from '@/infrastructure/nvidia/nvidia-client';
import { hybridSearch } from '@/infrastructure/database/product-repository';
import { searchDocumentChunks } from '@/infrastructure/database/document-repository';
import { buildSystemPrompt, buildMessages } from './prompt-builder';
import { retrieveUserMemory, maybeDispatchMemorySummarization } from './memory-service';
import { appendMessage } from '@/infrastructure/database/chat-history-repository';
import { Message, ProductSearchResult, DocumentSearchResult, RAGContext } from './types';
import {
  VECTOR_SEARCH_LIMIT,
  DOCUMENT_SEARCH_LIMIT,
  CHAT_TEMPERATURE,
  CHAT_TOP_P,
  MAX_COMPLETION_TOKENS,
} from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { EmbeddingError, DatabaseError } from '@/lib/errors';

const log = createLogger('RAGPipeline');

/**
 * The result type returned by executeRAGPipeline.
 * Contains the streaming result and RAG context metadata.
 */
export interface RAGPipelineResult {
  stream: Awaited<ReturnType<typeof streamText>>;
  context: RAGContext;
}

/**
 * Executes the full RAG pipeline with triple-retrieval.
 * 
 * This is the main entry point called by the API route handler.
 * It orchestrates all stages and returns a streaming result.
 * 
 * @param userQuery - The user's latest message/query
 * @param chatHistory - Previous conversation messages for context
 * @param sessionId - Client session ID for memory tracking (optional)
 * @returns RAGPipelineResult for streaming back to the client
 * 
 * @throws {EmbeddingError} If embedding generation fails
 * @throws {DatabaseError} If vector search fails
 */
export async function executeRAGPipeline(
  userQuery: string,
  chatHistory: Message[] = [],
  sessionId?: string
): Promise<RAGPipelineResult> {
  const startTime = Date.now();
  log.info('Starting RAG pipeline (triple-retrieval)', {
    query: userQuery,
    historyLength: chatHistory.length,
    hasSession: !!sessionId,
  });

  // ── Stage 1: Embed ──────────────────────────────────────────────────────
  log.info('Stage 1: Generating query embedding');
  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(userQuery, 'query');
    log.info('Embedding generated', { dimensions: queryEmbedding.length });
  } catch (error) {
    log.error('Embedding generation failed', { error: (error as Error).message });
    throw new EmbeddingError(
      `Failed to generate embedding for query: ${(error as Error).message}`,
      error as Error
    );
  }

  // ── Stage 2: Triple-Retrieve (Parallel) ─────────────────────────────────
  log.info('Stage 2: Performing parallel vector searches');

  // Fire all three searches simultaneously
  const [productResults, documentResults, userMemory] = await Promise.all([
    // Search 1: Products
    hybridSearch(userQuery, queryEmbedding, VECTOR_SEARCH_LIMIT).catch(error => {
      log.error('Product search failed', { error: (error as Error).message });
      return [] as ProductSearchResult[];
    }),

    // Search 2: Documents
    searchDocumentChunks(queryEmbedding, DOCUMENT_SEARCH_LIMIT).catch(error => {
      log.error('Document search failed', { error: (error as Error).message });
      return [] as DocumentSearchResult[];
    }),

    // Search 3: User Memory (only if sessionId provided)
    sessionId
      ? retrieveUserMemory(sessionId, queryEmbedding)
      : Promise.resolve(null),
  ]);

  log.info('Parallel search completed', {
    products: productResults.length,
    documents: documentResults.length,
    hasMemory: !!userMemory,
  });

  // ── Stage 2.5: Reranking ───────────────────────────────────────────────
  log.info('Stage 2.5: Reranking candidate chunks with Cohere');

  // Map products and documents into unified candidate chunks
  const candidateChunks = [
    ...productResults.map(p => ({
      type: 'product' as const,
      domainObject: p,
      text: `${p.name} - ${p.brand} - ${p.category}. ${p.description}`,
    })),
    ...documentResults.map(d => ({
      type: 'document' as const,
      domainObject: d,
      text: d.text,
    }))
  ];

  let rerankedProducts: ProductSearchResult[] = [];
  let rerankedDocuments: DocumentSearchResult[] = [];

  if (candidateChunks.length > 0) {
    try {
      const texts = candidateChunks.map(c => c.text);
      const { ranking } = await rerank({
        model: cohere.reranking('rerank-english-v3.0'),
        query: userQuery,
        documents: texts,
        topN: 5,
      });

      log.info('Reranking completed', { originalCount: candidateChunks.length, newCount: ranking.length });

      // Map back to original domain objects using originalIndex
      ranking.forEach((result: { originalIndex: number }) => {
        const originalChunk = candidateChunks[result.originalIndex];
        if (originalChunk.type === 'product') {
          rerankedProducts.push(originalChunk.domainObject as ProductSearchResult);
        } else {
          rerankedDocuments.push(originalChunk.domainObject as DocumentSearchResult);
        }
      });
    } catch (error) {
      log.error('Reranking failed, falling back to original results', { error: (error as Error).message });
      // Fallback
      rerankedProducts = productResults.slice(0, 5);
      rerankedDocuments = documentResults.slice(0, 5);
    }
  }

  const retrievedProducts: ProductSearchResult[] = rerankedProducts;
  const retrievedDocuments: DocumentSearchResult[] = rerankedDocuments;

  // ── Stage 3: Build Prompt (Triple Context) ──────────────────────────────
  log.info('Stage 3: Building system prompt with triple context');
  const systemPrompt = buildSystemPrompt(retrievedProducts, retrievedDocuments, userMemory);
  const messages = buildMessages(chatHistory, userQuery);

  const ragContext: RAGContext = {
    userQuery,
    queryEmbedding,
    retrievedProducts,
    retrievedDocuments,
    userMemory,
    systemPrompt,
  };

  // ── Stage 4: Generate (Stream) ──────────────────────────────────────────
  log.info('Stage 4: Streaming response from Nvidia');
  const model = getChatModel();

  const result = streamText({
    model,
    instructions: systemPrompt,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    temperature: CHAT_TEMPERATURE,
    topP: CHAT_TOP_P,
    maxOutputTokens: MAX_COMPLETION_TOKENS,
  });

  const pipelineDurationMs = Date.now() - startTime;
  log.info('RAG pipeline stages completed', {
    pipelineDurationMs,
    productsRetrieved: retrievedProducts.length,
    documentsRetrieved: retrievedDocuments.length,
    hasUserMemory: !!userMemory,
    promptLength: systemPrompt.length,
  });

  // ── Stage 5: Background — Persist & Memory (non-blocking) ──────────────
  if (sessionId) {
    // Fire and forget — don't block the response
    persistAndTriggerMemory(sessionId, userQuery, result).catch(err => {
      log.error('Background persist/memory failed', { error: (err as Error).message });
    });
  }

  return { stream: result, context: ragContext };
}

// ─── Background Persistence ─────────────────────────────────────────────────

/**
 * Persists the user message and assistant response to chat history,
 * then checks if memory summarization should be triggered.
 * Runs in the background after response streaming begins.
 */
async function persistAndTriggerMemory(
  sessionId: string,
  userQuery: string,
  streamResult: Awaited<ReturnType<typeof streamText>>
): Promise<void> {
  // Persist user message immediately
  await appendMessage(sessionId, 'user', userQuery);

  // Wait for full response text, then persist
  try {
    const fullText = await streamResult.text;
    if (fullText) {
      await appendMessage(sessionId, 'assistant', fullText);
    }
  } catch (error) {
    log.error('Failed to persist assistant message', {
      sessionId,
      error: (error as Error).message,
    });
  }

  // Check if memory summarization should be triggered
  await maybeDispatchMemorySummarization(sessionId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
