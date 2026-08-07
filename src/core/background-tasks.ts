// src/core/background-tasks.ts
import { waitUntil } from '@vercel/functions';
import { appendMessage } from '@/infrastructure/database/chat-history-repository';
import { saveToCache } from '@/infrastructure/database/cache-repository';
import { maybeDispatchMemorySummarization } from '@/core/memory-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('BackgroundTasks');

export function executeBackgroundPersistence(
  stream: any, 
  userId: string, 
  userQuery: string, 
  intent: string, 
  queryEmbedding?: number[] | null
) {
  waitUntil(
    (async () => {
      try {
        const fullText = await stream.text;
        if (fullText) {
          await appendMessage(userId, 'user', userQuery);
          await appendMessage(userId, 'assistant', fullText);

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
}