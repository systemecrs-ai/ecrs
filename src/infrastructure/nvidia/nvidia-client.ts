/**
 * Nvidia NIM API Client
 * 
 * Dual-purpose client for the Nvidia NIM platform:
 * 1. Chat completions via @ai-sdk/openai-compatible (for streaming with Vercel AI SDK)
 * 2. Embeddings via direct fetch (since the embedding model requires `input_type`)
 * 
 * @module infrastructure/nvidia/nvidia-client
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getNvidiaApiKey, getNvidiaBaseUrl, getNvidiaChatModel, getNvidiaEmbedModel } from '@/config/env';
import { EmbeddingInputType, EmbeddingResponse } from './types';
import { withRetry } from './retry-handler';
import { EmbeddingError, NvidiaApiError, RateLimitError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('NvidiaClient');

// ─── Chat Model (via Vercel AI SDK) ─────────────────────────────────────────

/**
 * Lazily-initialized Nvidia NIM provider for Vercel AI SDK.
 * Uses the OpenAI-compatible interface to connect to the NIM endpoint.
 */
let _nvidiaProvider: ReturnType<typeof createOpenAICompatible> | null = null;

function getNvidiaProvider() {
  if (!_nvidiaProvider) {
    _nvidiaProvider = createOpenAICompatible({
      name: 'nvidia-nim',
      baseURL: getNvidiaBaseUrl(),
      apiKey: getNvidiaApiKey(),
    });
  }
  return _nvidiaProvider;
}

/**
 * Returns a Vercel AI SDK-compatible chat model instance
 * for the configured Nvidia Nemotron model.
 * 
 * @example
 * ```ts
 * import { streamText } from 'ai';
 * const model = getChatModel();
 * const result = await streamText({ model, messages });
 * ```
 */
export function getChatModel() {
  const modelId = getNvidiaChatModel();
  log.debug('Creating chat model instance', { model: modelId });
  return getNvidiaProvider().chatModel(modelId);
}

// ─── Embeddings (via direct fetch) ──────────────────────────────────────────

/**
 * Generates an embedding vector for the given text using the Nvidia
 * Nemotron embedding model. Wraps the call in retry logic for resilience.
 * 
 * @param text - The text to embed
 * @param inputType - 'query' for user queries, 'passage' for documents
 * @returns The embedding vector as a number array (1024 dimensions)
 * 
 * @throws {EmbeddingError} If embedding generation fails after retries
 */
export async function getEmbedding(
  text: string,
  inputType: EmbeddingInputType = 'query'
): Promise<number[]> {
  log.info('Generating embedding', {
    textLength: text.length,
    inputType,
  });

  return withRetry(
    () => fetchEmbedding(text, inputType),
    {
      operationName: 'embedding',
      maxAttempts: 3,
    }
  );
}

/**
 * Generates embeddings for multiple texts in a single API call.
 * Useful for batch-indexing product documents.
 * 
 * @param texts - Array of texts to embed
 * @param inputType - 'query' for user queries, 'passage' for documents
 * @returns Array of embedding vectors
 */
export async function getEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType = 'passage'
): Promise<number[][]> {
  log.info('Generating batch embeddings', {
    count: texts.length,
    inputType,
  });

  return withRetry(
    () => fetchBatchEmbeddings(texts, inputType),
    {
      operationName: 'batch-embedding',
      maxAttempts: 3,
    }
  );
}

// ─── Private Implementation ─────────────────────────────────────────────────

/**
 * Raw fetch call to the Nvidia embeddings endpoint.
 * Handles 429 rate limits by throwing RateLimitError with Retry-After.
 */
async function fetchEmbedding(
  text: string,
  inputType: EmbeddingInputType
): Promise<number[]> {
  const baseUrl = getNvidiaBaseUrl();
  const url = `${baseUrl}/embeddings`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getNvidiaApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: getNvidiaEmbedModel(),
      input_type: inputType,
      encoding_format: 'float',
      truncate: 'END',
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: EmbeddingResponse = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new EmbeddingError('Nvidia API returned empty embedding data');
  }

  log.debug('Embedding generated successfully', {
    dimensions: data.data[0].embedding.length,
    tokens: data.usage?.total_tokens,
  });

  return data.data[0].embedding;
}

/**
 * Batch embedding fetch — embeds multiple texts in a single request.
 */
async function fetchBatchEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType
): Promise<number[][]> {
  const baseUrl = getNvidiaBaseUrl();
  const url = `${baseUrl}/embeddings`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getNvidiaApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: getNvidiaEmbedModel(),
      input_type: inputType,
      encoding_format: 'float',
      truncate: 'END',
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: EmbeddingResponse = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Handles non-OK API responses, extracting error details and
 * throwing appropriate typed errors.
 */
async function handleApiError(response: Response): Promise<never> {
  const status = response.status;

  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : null;
    log.warn('Rate limit hit on Nvidia API', { retryAfterMs });
    throw new RateLimitError(retryAfterMs);
  }

  let errorBody = '';
  try {
    errorBody = await response.text();
  } catch {
    // Ignore body read errors
  }

  log.error('Nvidia API error', {
    status,
    body: errorBody.slice(0, 500),
  });

  throw new NvidiaApiError(
    `Nvidia API returned ${status}: ${errorBody.slice(0, 200)}`,
    status,
    status >= 500
  );
}
