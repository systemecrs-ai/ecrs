/**
 * Memory Service
 * 
 * Orchestrates memory-related operations for the RAG pipeline:
 * - Checks if memory summarization should be triggered
 * - Dispatches summarization jobs to the Inngest queue
 * - Retrieves user memory for query augmentation
 * 
 * @module core/memory-service
 */

import { inngest } from '@/infrastructure/queue/inngest-client';
import { getMessageCount } from '@/infrastructure/database/chat-history-repository';
import { searchUserMemory } from '@/infrastructure/database/memory-repository';
import { MEMORY_TRIGGER_INTERVAL } from '@/config/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('MemoryService');

/**
 * Checks the message count for a session and dispatches a memory
 * summarization job if the threshold is met.
 * 
 * Triggers every MEMORY_TRIGGER_INTERVAL messages (default: 5).
 * 
 * @param sessionId - The client session identifier
 */
export async function maybeDispatchMemorySummarization(
  sessionId: string
): Promise<void> {
  try {
    const count = await getMessageCount(sessionId);

    // Trigger on multiples of the interval (5, 10, 15, ...)
    if (count > 0 && count % MEMORY_TRIGGER_INTERVAL === 0) {
      log.info('Dispatching memory summarization', { sessionId, messageCount: count });

      await inngest.send({
        name: 'memory/summarize.requested',
        data: {
          sessionId,
          messageCount: count,
        },
      });

      log.info('Memory summarization dispatched', { sessionId });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Non-critical — don't throw, just log
    log.error('Failed to dispatch memory summarization', {
      sessionId,
      error: err.message,
    });
  }
}

/**
 * Retrieves the user's memory context for the RAG pipeline.
 * 
 * Performs a vector search on the user_memory_vectors collection
 * filtered by sessionId, and returns the combined summary text.
 * 
 * @param sessionId - The client session identifier
 * @param queryEmbedding - The query embedding for relevance matching
 * @returns Combined memory summary or null if no memory exists
 */
export async function retrieveUserMemory(
  sessionId: string,
  queryEmbedding: number[]
): Promise<string | null> {
  try {
    const results = await searchUserMemory(sessionId, queryEmbedding);

    if (results.length === 0) {
      log.debug('No user memory found', { sessionId });
      return null;
    }

    // Combine all memory summaries (usually just one per session)
    const combined = results
      .map(r => r.summary)
      .join('\n\n');

    log.info('User memory retrieved', {
      sessionId,
      resultCount: results.length,
      summaryLength: combined.length,
    });

    return combined;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to retrieve user memory', {
      sessionId,
      error: err.message,
    });
    // Non-critical — return null on failure
    return null;
  }
}
