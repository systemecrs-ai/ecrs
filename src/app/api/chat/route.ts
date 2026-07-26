/**
 * Chat API Route Handler
 * 
 * POST /api/chat — Accepts user messages, runs the triple-retrieval
 * RAG pipeline, and returns a streaming text response via Vercel AI SDK v7.
 * 
 * Includes a Semantic Interception Cache (MongoDB Atlas Vector Search)
 * that bypasses the heavy LLM for repetitive queries with ≥95%
 * cosine similarity.
 * 
 * Authenticates users via Supabase, extracts threadId for
 * conversation isolation, and persists messages to chat history.
 * 
 * @module app/api/chat/route
 */

import { simulateReadableStream } from 'ai';
import { executeRAGPipeline } from '@/core/rag-pipeline';
import { runWithContext } from '@/lib/request-context';
import { getEmbedding } from '@/infrastructure/nvidia/nvidia-client';
import { checkCache, saveToCache } from '@/infrastructure/database/cache-repository';

import { ValidationError, AppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatRoute');

/**
 * Handles POST requests to /api/chat.
 * 
 * The request body follows the Vercel AI SDK v7 transport protocol,
 * containing a messages array with UIMessage objects and a threadId.
 * 
 * Returns a streaming response using Vercel AI SDK's UI message stream protocol.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // ── Parse & Validate Request ─────────────────────────────────────────
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ValidationError('Request must include a non-empty "messages" array.');
    }

    // ── Authenticate — extract verified userId from middleware header ─────
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      throw new AppError('Unauthorized access to chat API.', 'UNAUTHORIZED', 401);
    }

    // ── Extract threadId from request body ────────────────────────────────
    const threadId = typeof body.threadId === 'string' && body.threadId.trim()
      ? body.threadId.trim()
      : 'default';

    // Extract the latest user message from the v7 UIMessage format
    const messages = body.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      throw new ValidationError('Last message must be a user message.');
    }

    // Extract text from parts (v7 UIMessage format) or fallback to content
    let userQuery = '';
    if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
      userQuery = lastMessage.parts
        .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text)
        .map((p: { text: string }) => p.text)
        .join('');
    } else if (lastMessage.content) {
      userQuery = lastMessage.content;
    }

    userQuery = userQuery.trim();
    if (!userQuery) {
      throw new ValidationError('User message must contain non-empty text.');
    }

    // Build chat history from previous messages
    const chatHistory = messages.slice(0, -1).map((msg: {
      role: string;
      parts?: Array<{ type: string; text?: string }>;
      content?: string;
    }) => {
      let content = '';
      if (msg.parts && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((p: { type: string; text?: string }) => p.type === 'text' && typeof p.text === 'string')
          .map((p: { type: string; text?: string }) => p.text ?? '')
          .join('');
      } else if (msg.content) {
        content = msg.content;
      }
      return { role: msg.role as 'user' | 'assistant' | 'system', content };
    });

    log.info('Chat request received', {
      query: userQuery.slice(0, 100),
      historyLength: chatHistory.length,
      userId,
      threadId,
    });

    // ── Step A: Embed Query for Semantic Cache ───────────────────────────
    // Uses the same NvidiaClient embedding function as the RAG pipeline.
    // This embedding is used for cache lookup; the pipeline generates
    // its own embedding independently (preserving its internal flow).
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await getEmbedding(userQuery, 'query');
      log.debug('Query embedded for semantic cache', {
        dimensions: queryEmbedding.length,
      });
    } catch (error) {
      // Embedding failure for cache should not block the pipeline
      log.warn('Semantic cache embedding failed, skipping cache', {
        error: (error as Error).message,
      });
    }

    // ── Step B: Check Semantic Cache ─────────────────────────────────────
    if (queryEmbedding) {
      const cacheResult = await checkCache(queryEmbedding);

      // ── Step C: Cache Hit — return simulated stream immediately ────────
      if (cacheResult.hit) {
        log.info('Semantic cache HIT — bypassing RAG pipeline', {
          score: cacheResult.score.toFixed(4),
          answerLength: cacheResult.answer.length,
        });

        // Split cached answer into word-boundary chunks for a natural
        // streaming feel that matches the live LLM output cadence.
        const chunks = cacheResult.answer.split(/(\s+)/);
        const simulatedStream = simulateReadableStream({
          chunks,
          initialDelayInMs: 0,
          chunkDelayInMs: 15,
        });

        return new Response(simulatedStream, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      log.debug('Semantic cache MISS — proceeding with RAG pipeline');
    }

    // ── Step D: Cache Miss — Execute RAG Pipeline (Triple-Retrieval) ─────
    // Wrap in request context so that downstream appendMessage calls
    // in the RAG pipeline automatically receive userId + threadId.
    // The pipeline receives userId as its user identity parameter
    // (memory retrieval is user-scoped, not thread-scoped).
    const { stream } = await runWithContext(
      { userId, threadId },
      () => executeRAGPipeline(userQuery, chatHistory, userId)
    );

    // ── Async Write: Save to Semantic Cache (non-blocking) ──────────────
    // After the stream completes, save the query + embedding + answer to
    // MongoDB. Uses a detached promise chain — does not delay the response.
    if (queryEmbedding) {
      const capturedEmbedding = queryEmbedding;
      const capturedQuery = userQuery;
      Promise.resolve(stream.text)
        .then((fullText: string) => {
          if (fullText) {
            return saveToCache(capturedQuery, capturedEmbedding, fullText);
          }
        })
        .catch((err: Error) => {
          log.error('Semantic cache async write failed', {
            error: err.message,
          });
        });
    }

    // ── Return Streaming Response ────────────────────────────────────────
    return stream.toTextStreamResponse();
  } catch (error) {
    return handleError(error);
  }
}

// ─── Error Handler ──────────────────────────────────────────────────────────

/**
 * Maps application errors to appropriate HTTP responses.
 */
function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    log.error(`${error.name}: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
    });

    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Unknown errors
  const err = error instanceof Error ? error : new Error(String(error));
  log.error('Unexpected error in chat route', { error: err.message, stack: err.stack });

  return new Response(
    JSON.stringify({
      error: 'An internal server error occurred. Please try again.',
      code: 'INTERNAL_ERROR',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
