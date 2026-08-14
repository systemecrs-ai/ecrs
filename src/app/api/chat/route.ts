/**
 * Chat API Route Handler — Enterprise Architecture
 * @module app/api/chat/route
 */

import { streamText, simulateReadableStream } from 'ai';
import { getFastModel, getChatModel, getEmbedding } from '@/infrastructure/nvidia/nvidia-client';
import { checkCache } from '@/infrastructure/database/cache-repository';
import { executeRAGPipeline } from '@/core/rag-pipeline';
import { runWithContext } from '@/lib/request-context';
import { classifyUserIntent, getScopedTools } from '@/core/intent-service';
import { executeBackgroundPersistence } from '@/core/background-tasks';
import { parseChatRequest } from '@/utils/request-parser'; // (Move your parsing logic here)
import { handleError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { buildActionPrompt } from '@/core/prompt-builder';

const log = createLogger('ChatRoute');

export async function POST(req: Request): Promise<Response> {
  try {
    // 1. Parse Request (Moved parsing logic to a utility to keep route clean)
    const { userId, threadId, userQuery, chatHistory, formattedHistory, canvasState } = await parseChatRequest(req);

    // 2. Classify Intent
    const { intent, subDomain } = await classifyUserIntent(userQuery, formattedHistory);

    // ── BRANCH A: CASUAL (Fastest, No Tools, No RAG) ─────────────────────
    if (intent === 'CASUAL') {
      const casualStream = streamText({
        model: getFastModel(),
        messages: [...chatHistory, { role: 'user', content: userQuery }],
      });
      executeBackgroundPersistence(casualStream, userId, userQuery, intent);
      return casualStream.toUIMessageStreamResponse();
    }

    // ── BRANCH B: TOOL ACTION (Short-Circuit: Bypass Embeddings & RAG) ───
    if (intent === 'TOOL_ACTION') {
      log.info('Short-circuiting to Tool Action', { subDomain });
      
      const actionStream = streamText({
        model: getChatModel(), // 70B Model
        tools: getScopedTools(subDomain), // Pass ONLY the required tool
        
        // 👉 THE FIX: Top-level system property using our new robust builder
        system: buildActionPrompt(subDomain, canvasState),
        
        messages: [
          ...chatHistory,
          { role: 'user', content: userQuery }
        ],
      });
      
      executeBackgroundPersistence(actionStream, userId, userQuery, intent);
      return actionStream.toUIMessageStreamResponse();
    }

    // ── BRANCH C: RAG KNOWLEDGE (Requires Embeddings, Cache, & DB Search) ─
    let queryEmbedding = await getEmbedding(userQuery, 'query').catch(() => null);

    // Check Semantic Cache first
    if (queryEmbedding && intent === 'RAG_KNOWLEDGE' && subDomain === 'POLICY_LOOKUP') {
      const cacheResult = await checkCache(userQuery, queryEmbedding);
      if (cacheResult.hit) {
        log.info('Semantic cache HIT', { score: cacheResult.score.toFixed(4) });
        const simulatedStream = simulateReadableStream({ chunks: cacheResult.answer.split(/(\s+)/) });
        return new Response(simulatedStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }

    // Run Full RAG Pipeline
    const { stream } = await runWithContext({ userId, threadId }, () =>
      executeRAGPipeline(userQuery, chatHistory, userId, intent, subDomain, canvasState, queryEmbedding)
    );

    executeBackgroundPersistence(stream, userId, userQuery, intent, queryEmbedding);
    return stream.toUIMessageStreamResponse();

  } catch (error) {
    return handleError(error);
  }
}