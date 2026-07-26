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
 * Checks the message count for a user and dispatches a memory
 * summarization job if the threshold is met.
 * 
 * Triggers every MEMORY_TRIGGER_INTERVAL messages (default: 5).
 * 
 * @param userId - The Supabase-verified user ID
 */
export async function maybeDispatchMemorySummarization(
  userId: string
): Promise<void> {
  try {
    const count = await getMessageCount(userId);

    // Trigger on multiples of the interval (5, 10, 15, ...)
    if (count > 0 && count % MEMORY_TRIGGER_INTERVAL === 0) {
      log.info('Dispatching memory summarization', { userId, messageCount: count });

      await inngest.send({
        name: 'memory/summarize.requested',
        data: {
          userId,
          messageCount: count,
        },
      });

      log.info('Memory summarization dispatched', { userId });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Non-critical — don't throw, just log
    log.error('Failed to dispatch memory summarization', {
      userId,
      error: err.message,
    });
  }
}

/**
 * Retrieves the user's memory context for the RAG pipeline.
 * 
 * Performs a vector search on the user_memory_vectors collection
 * filtered by userId, and returns the combined summary text.
 * 
 * @param userId - The Supabase-verified user ID
 * @param queryEmbedding - The query embedding for relevance matching
 * @returns Combined memory summary or null if no memory exists
 */
export async function retrieveUserMemory(
  userId: string,
  queryEmbedding: number[]
): Promise<string | null> {
  try {
    const results = await searchUserMemory(userId, queryEmbedding);

    if (results.length === 0) {
      log.debug('No user memory found', { userId });
      return null;
    }

    // Combine all memory summaries (usually just one per user)
    const combined = results
      .map(r => r.summary)
      .join('\n\n');

    log.info('User memory retrieved', {
      userId,
      resultCount: results.length,
      summaryLength: combined.length,
    });

    return combined;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to retrieve user memory', {
      userId,
      error: err.message,
    });
    // Non-critical — return null on failure
    return null;
  }
}
