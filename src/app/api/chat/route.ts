/**
 * Chat API Route Handler — Enterprise Architecture
 * @module app/api/chat/route
 */

import { generateText, simulateReadableStream, streamText, isStepCount } from 'ai';
import { waitUntil } from '@vercel/functions';
import { executeRAGPipeline } from '@/core/rag-pipeline';
import { runWithContext } from '@/lib/request-context';
import { getEmbedding, getFastModel, getChatModel } from '@/infrastructure/nvidia/nvidia-client';
import { checkCache, saveToCache } from '@/infrastructure/database/cache-repository';
import { agentTools } from '@/infrastructure/tools';
import { appendMessage } from '@/infrastructure/database/chat-history-repository';
import { maybeDispatchMemorySummarization } from '@/core/memory-service';

import { ValidationError, AppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { buildIntentPrompt, buildSystemPrompt } from '@/core/prompt-builder';

const log = createLogger('ChatRoute');

export async function POST(req: Request): Promise<Response> {
  try {
    // ── 1. Parse & Validate Request ───────────────────────────────────────
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ValidationError('Request must include a non-empty "messages" array.');
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      throw new AppError('Unauthorized access to chat API.', 'UNAUTHORIZED', 401);
    }

    const threadId = typeof body.threadId === 'string' && body.threadId.trim()
      ? body.threadId.trim()
      : 'default';

    // Extract current Canvas State sent from React client
    const canvasState = typeof body.canvasState === 'string' ? body.canvasState : null;

    const messages = body.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      throw new ValidationError('Last message must be a user message.');
    }

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

    // Build chat history array
    const chatHistory = messages.slice(0, -1).map((msg: any) => {
      let content = '';
      if (msg.parts && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('');
      } else if (msg.content) {
        content = msg.content;
      }
      return { role: msg.role as 'user' | 'assistant' | 'system', content };
    });

    log.info('Chat request received', { query: userQuery.slice(0, 100), historyLength: chatHistory.length, userId, threadId });

    // Format short history for Intent Router
    const recentHistory = chatHistory.slice(-3);
    const formattedHistory = recentHistory.length > 0
      ? recentHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : 'None';

    // ── 2. Front-Door Intent Routing ─────────────────────────────────────
    const { text: intentResponse } = await generateText({
      model: getFastModel(),
      prompt: buildIntentPrompt(userQuery, formattedHistory),
    });

    let intent = 'RAG_KNOWLEDGE';
    let subDomain = 'GENERAL_HYBRID';

    const lines = intentResponse.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('INTENT:')) {
        const i = line.replace('INTENT:', '').trim().toUpperCase();
        if (i.includes('CASUAL')) intent = 'CASUAL';
        else if (i.includes('TOOL_ACTION')) intent = 'TOOL_ACTION';
        else if (i.includes('RAG')) intent = 'RAG_KNOWLEDGE';
      }
      if (line.startsWith('SUBDOMAIN:')) {
        const s = line.replace('SUBDOMAIN:', '').trim().toUpperCase();
        if (s.includes('PRODUCT_SEARCH')) subDomain = 'PRODUCT_SEARCH';
        else if (s.includes('POLICY_LOOKUP')) subDomain = 'POLICY_LOOKUP';
        else if (s.includes('GENERAL_HYBRID')) subDomain = 'GENERAL_HYBRID';
      }
    }

    log.info('Intent classified', { intent, subDomain, raw: intentResponse });

    // ── Branch A: CASUAL Intent ───────────────────────────────────────────
    if (intent === 'CASUAL') {
      log.info('Streaming CASUAL response via 8B model');
      const casualStream = streamText({
        model: getFastModel(),
        messages: [
          ...chatHistory.map((m : any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: userQuery }
        ],
      });
      return casualStream.toUIMessageStreamResponse();
    }

    // ── 3. Compute Vector Embedding ONCE (Reuse for Cache & RAG) ─────────
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await getEmbedding(userQuery, 'query');
    } catch (error) {
      log.warn('Embedding generation failed, skipping cache', { error: (error as Error).message });
    }

    // ── Branch B: Semantic Cache Check (Only for RAG_KNOWLEDGE) ───────────
    if (queryEmbedding && intent === 'RAG_KNOWLEDGE') {
      const cacheResult = await checkCache(userQuery, queryEmbedding);
      if (cacheResult.hit) {
        log.info('Semantic cache HIT — bypassing RAG pipeline', { score: cacheResult.score.toFixed(4) });

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
    }

    // ── Branch C: Unified Agent Execution (RAG + TOOL_ACTION) ────────────
    // Pass pre-computed embedding and client canvasState to avoid duplicate calls
    const { stream } = await runWithContext(
      { userId, threadId },
      () => executeRAGPipeline(
        userQuery, 
        chatHistory, 
        userId, 
        intent, 
        subDomain, 
        canvasState, 
        queryEmbedding // Reuses existing embedding!
      )
    );

    // ── 4. Enterprise Serverless Background Writes (`waitUntil`) ─────────
    // Guarantees background database persistence won't be killed on Lambda freeze
    waitUntil(
      (async () => {
        try {
          const fullText = await stream.text;
          if (fullText) {
            await appendMessage(userId, 'user', userQuery);
            await appendMessage(userId, 'assistant', fullText);

            // Save to semantic cache if it was a RAG search
            if (queryEmbedding && intent === 'RAG_KNOWLEDGE') {
              await saveToCache(userQuery, queryEmbedding, fullText);
            }
            await maybeDispatchMemorySummarization(userId);
          }
        } catch (err) {
          log.error('Background persistence failed', { error: (err as Error).message });
        }
      })()
    );

    return stream.toUIMessageStreamResponse();

  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    log.error(`${error.name}: ${error.message}`, { code: error.code, statusCode: error.statusCode });
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const err = error instanceof Error ? error : new Error(String(error));
  log.error('Unexpected error in chat route', { error: err.message, stack: err.stack });

  return new Response(JSON.stringify({ error: 'An internal server error occurred.', code: 'INTERNAL_ERROR' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}