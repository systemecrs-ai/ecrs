/**
 * Summarization Service
 * 
 * Generates concise summaries for complex document chunks
 * (tables, image descriptions) using a lightweight Nvidia LLM.
 * These summaries become the "child" in parent-child retrieval:
 * the summary is vectorized and searched, while the full raw
 * content (parent) is returned to the LLM for grounding.
 * 
 * @module core/summarization-service
 */

import { getNvidiaApiKey, getNvidiaBaseUrl, getNvidiaSummarizationModel } from '@/config/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('SummarizationService');

/**
 * Generates a short, searchable summary for a complex chunk.
 * 
 * For tables: Describes what the table contains, key columns,
 * and notable data points.
 * 
 * For image descriptions: Creates a natural language summary
 * of what the image depicts.
 * 
 * @param content - The raw Markdown content to summarize
 * @param chunkType - The type of content ('table' | 'image_description')
 * @returns A concise summary (typically 1-3 sentences)
 */
export async function generateChunkSummary(
  content: string,
  chunkType: 'table' | 'image_description'
): Promise<string> {
  log.info('Generating chunk summary', { chunkType, contentLength: content.length });

  const prompt = buildSummarizationPrompt(content, chunkType);

  try {
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
            content: 'You are a precise document summarizer. Generate concise, searchable summaries of document content. Focus on key information that a user might search for.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log.error('Summarization API error', { status: response.status, error: errorText });
      // Fallback: use truncated content as summary
      return createFallbackSummary(content, chunkType);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      log.warn('Empty summary returned, using fallback');
      return createFallbackSummary(content, chunkType);
    }

    log.debug('Summary generated', { summaryLength: summary.length });
    return summary;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Summarization failed, using fallback', { error: err.message });
    return createFallbackSummary(content, chunkType);
  }
}

// ─── Private Helpers ────────────────────────────────────────────────────────

/**
 * Builds the appropriate summarization prompt based on chunk type.
 */
function buildSummarizationPrompt(content: string, chunkType: 'table' | 'image_description'): string {
  if (chunkType === 'table') {
    return `Summarize the following Markdown table in 1-3 sentences. Describe what the table contains, its key columns/categories, and any notable patterns or data points. Make the summary useful for search retrieval.

TABLE:
${content}

SUMMARY:`;
  }

  return `Summarize the following image description in 1-2 sentences. Focus on what the image depicts and its relevance to the document.

IMAGE DESCRIPTION:
${content}

SUMMARY:`;
}

/**
 * Creates a fallback summary when the LLM call fails.
 * Extracts the first line of content and truncates.
 */
function createFallbackSummary(content: string, chunkType: 'table' | 'image_description'): string {
  const prefix = chunkType === 'table' ? 'Table containing:' : 'Image:';
  const firstLine = content.split('\n').find(l => l.trim().length > 0) || content;
  const truncated = firstLine.slice(0, 150).trim();
  return `${prefix} ${truncated}${firstLine.length > 150 ? '...' : ''}`;
}
