/**
 * Memory Worker
 * 
 * Inngest background function that summarizes permanent user traits
 * from chat history. Triggered every N messages by the chat route.
 * 
 * Extracts preferences like size, fit, style, budget constraints,
 * and stores them as vectorized summaries for retrieval during chat.
 * 
 * @module core/workers/memory-worker
 */

import { inngest } from '@/infrastructure/queue/inngest-client';
import { getRecentMessagesByUser } from '@/infrastructure/database/chat-history-repository';
import { upsertUserMemory, getUserMemoryByUser } from '@/infrastructure/database/memory-repository';
import { getEmbedding } from '@/infrastructure/nvidia/nvidia-client';
import { getNvidiaApiKey, getNvidiaBaseUrl, getNvidiaSummarizationModel } from '@/config/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('MemoryWorker');

/**
 * Inngest function definition for memory summarization.
 */
export const memorySummarizeFunction = inngest.createFunction(
  {
    id: 'summarize-user-memory',
    retries: 2,
    triggers: [{ event: 'memory/summarize.requested' }],
  },
  async ({ event, step }) => {
    const { userId, messageCount } = event.data;

    log.info('Memory summarization started', { userId, messageCount });

    // ── Step 1: Fetch Chat History ────────────────────────────────────────
    const history = await step.run('fetch-history', async () => {
      const messages = await getRecentMessagesByUser(userId, 30);
      log.info('Chat history fetched', {
        userId,
        messageCount: messages.length,
      });
      return messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
    });

    if (history.length < 5) {
      log.info('Not enough history for summarization, skipping', { userId });
      return { userId, skipped: true };
    }

    // ── Step 2: Get Existing Memory ───────────────────────────────────────
    const existingMemory = await step.run('get-existing-memory', async () => {
      const memory = await getUserMemoryByUser(userId);
      return memory?.summary || null;
    });

    // ── Step 3: Summarize User Traits ─────────────────────────────────────
    const summary = await step.run('summarize-traits', async () => {
      log.info('Generating user trait summary', { userId });

      const conversationText = history
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const prompt = buildMemorySummarizationPrompt(conversationText, existingMemory);

      const baseUrl = getNvidiaBaseUrl();
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getNvidiaApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getNvidiaSummarizationModel(),
          messages: [
            {
              role: 'system',
              content: 'You are a precise memory extraction agent. Extract ONLY factual, permanent user traits from conversations. Be concise and structured.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`Memory summarization failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content?.trim();

      if (!result) {
        throw new Error('Empty summary returned from LLM');
      }

      log.info('User traits summarized', {
        userId,
        summaryLength: result.length,
      });

      return result;
    });

    // ── Step 4: Vectorize Summary ─────────────────────────────────────────
    const embedding = await step.run('embed-summary', async () => {
      log.info('Vectorizing memory summary', { userId });
      return await getEmbedding(summary, 'passage');
    });

    // ── Step 5: Store Memory ──────────────────────────────────────────────
    await step.run('store-memory', async () => {
      log.info('Storing user memory', { userId });
      await upsertUserMemory(userId, summary, embedding, messageCount);
      log.info('User memory stored successfully', { userId });
    });

    return { userId, summaryLength: summary.length };
  }
);

// ─── Private Helpers ────────────────────────────────────────────────────────

/**
 * Builds the prompt for extracting permanent user traits from conversation.
 */
function buildMemorySummarizationPrompt(
  conversation: string,
  existingMemory: string | null
): string {
  const existingSection = existingMemory
    ? `\n\nEXISTING MEMORY (update and refine, don't discard unless contradicted):\n${existingMemory}`
    : '';

  return `Analyze the following conversation and extract PERMANENT user traits and preferences. Focus on:

1. **Body/Size**: Clothing sizes, shoe sizes, body type mentions
2. **Style Preferences**: Preferred fits (slim, relaxed), styles (casual, formal), aesthetics
3. **Color Preferences**: Favorite colors, colors they avoid
4. **Brand Preferences**: Brands they like or dislike
5. **Budget**: Price sensitivity, budget constraints
6. **Occasion**: Types of events or contexts they shop for
7. **Other**: Allergies to materials, ethical preferences (vegan leather, sustainable), etc.

ONLY extract information the user has explicitly stated. Do NOT infer or guess.
Format as a concise bullet list of confirmed facts.${existingSection}

CONVERSATION:
${conversation}

EXTRACTED USER TRAITS:`;
}
