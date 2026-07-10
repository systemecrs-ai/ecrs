/**
 * Chat API Route Handler
 * 
 * POST /api/chat — Accepts user messages, runs the triple-retrieval
 * RAG pipeline, and returns a streaming text response via Vercel AI SDK v7.
 * 
 * Now accepts sessionId for long-term memory tracking and
 * persists messages to chat history for the memory worker.
 * 
 * @module app/api/chat/route
 */

import { executeRAGPipeline } from '@/core/rag-pipeline';
import { ValidationError, AppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatRoute');

/**
 * Handles POST requests to /api/chat.
 * 
 * The request body follows the Vercel AI SDK v7 transport protocol,
 * containing a messages array with UIMessage objects and an optional sessionId.
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

    // Extract sessionId from request body or headers
    const sessionId: string | undefined =
      body.sessionId ||
      req.headers.get('x-session-id') ||
      undefined;

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
      hasSession: !!sessionId,
    });

    // ── Execute RAG Pipeline (Triple-Retrieval) ──────────────────────────
    const { stream } = await executeRAGPipeline(userQuery, chatHistory, sessionId);

    // ── Return Streaming Response ────────────────────────────────────────
    return stream.toUIMessageStreamResponse();

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
