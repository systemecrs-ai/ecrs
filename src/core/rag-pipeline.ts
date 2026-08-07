import { rerank, streamText } from 'ai';
import { cohere } from '@ai-sdk/cohere';
import { waitUntil } from '@vercel/functions'; // <-- Added for serverless safety
import { getEmbedding, getChatModel } from '@/infrastructure/nvidia/nvidia-client';
import { hybridSearch } from '@/infrastructure/database/product-repository';
import { searchDocumentChunks } from '@/infrastructure/database/document-repository';
import { buildSystemPrompt, buildMessages } from './prompt-builder';
import { retrieveUserMemory, maybeDispatchMemorySummarization } from './memory-service';
import { appendMessage } from '@/infrastructure/database/chat-history-repository';
import { agentTools } from '@/infrastructure/tools'; // <-- Added to bind UI tools
import { Message, ProductSearchResult, DocumentSearchResult, RAGContext } from './types';
import {
  VECTOR_SEARCH_LIMIT,
  DOCUMENT_SEARCH_LIMIT,
  CHAT_TEMPERATURE,
  CHAT_TOP_P,
  MAX_COMPLETION_TOKENS,
} from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { EmbeddingError } from '@/lib/errors';

const log = createLogger('RAGPipeline');

export interface RAGPipelineResult {
  stream: {
    text: PromiseLike<string>;
    toUIMessageStreamResponse: (options?: any) => Response;
  };
  context: RAGContext;
}

export async function executeRAGPipeline(
  userQuery: string,
  chatHistory: Message[] = [],
  userId?: string,
  intent: string = 'RAG_KNOWLEDGE',
  subDomain: string = 'GENERAL_HYBRID',
  canvasState: string | null = null,
  queryEmbedding?: number[] | null // <-- Accepts embedding from route.ts to save money/time
): Promise<RAGPipelineResult> {
  const startTime = Date.now();
  log.info('Starting RAG pipeline (triple-retrieval)', { query: userQuery, hasUser: !!userId });

  // ── Stage 1: Embed (Or Reuse) ───────────────────────────────────────────
  if (!queryEmbedding) {
    try {
      queryEmbedding = await getEmbedding(userQuery, 'query');
      log.info('Embedding generated', { dimensions: queryEmbedding.length });
    } catch (error) {
      log.error('Embedding generation failed', { error: (error as Error).message });
      throw new EmbeddingError(`Failed to generate embedding: ${(error as Error).message}`, error as Error);
    }
  }

  // ── Stage 2: Triple-Retrieve (Parallel) ─────────────────────────────────
  const [productResults, documentResults, userMemory] = await Promise.all([
    subDomain !== 'POLICY_LOOKUP'
      ? hybridSearch(userQuery, queryEmbedding, VECTOR_SEARCH_LIMIT).catch(error => {
          log.error('Product search failed', { error: (error as Error).message });
          return [] as ProductSearchResult[];
        })
      : Promise.resolve([]),

    subDomain !== 'PRODUCT_SEARCH'
      ? searchDocumentChunks(queryEmbedding, DOCUMENT_SEARCH_LIMIT).catch(error => {
          log.error('Document search failed', { error: (error as Error).message });
          return [] as DocumentSearchResult[];
        })
      : Promise.resolve([]),

    userId ? retrieveUserMemory(userId, queryEmbedding) : Promise.resolve(null),
  ]);

  // ── Stage 2.5: Reranking ───────────────────────────────────────────────
  const candidateChunks = [
    ...productResults.map(p => ({ type: 'product' as const, domainObject: p, text: `${p.name} - ${p.brand}. ${p.description}` })),
    ...documentResults.map(d => ({ type: 'document' as const, domainObject: d, text: d.text }))
  ];

  let rerankedProducts: ProductSearchResult[] = [];
  let rerankedDocuments: DocumentSearchResult[] = [];

  if (candidateChunks.length > 0) {
    try {
      const texts = candidateChunks.map(c => c.text);
      const { ranking } = await rerank({
        model: cohere.reranking('rerank-english-v3.0'),
        query: userQuery,
        documents: texts,
        topN: 5,
      });

      ranking.forEach((result: { originalIndex: number }) => {
        const originalChunk = candidateChunks[result.originalIndex];
        if (originalChunk.type === 'product') {
          rerankedProducts.push(originalChunk.domainObject as ProductSearchResult);
        } else {
          rerankedDocuments.push(originalChunk.domainObject as DocumentSearchResult);
        }
      });
    } catch (error) {
      log.error('Reranking failed, falling back', { error: (error as Error).message });
      rerankedProducts = productResults.slice(0, 5);
      rerankedDocuments = documentResults.slice(0, 5);
    }
  }

  // ── Stage 3: Build Prompt ───────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(intent, subDomain, canvasState, rerankedProducts, rerankedDocuments, userMemory);
  const messages = buildMessages(chatHistory, userQuery);

  const ragContext: RAGContext = {
    userQuery,
    queryEmbedding,
    retrievedProducts: rerankedProducts,
    retrievedDocuments: rerankedDocuments,
    userMemory,
    systemPrompt,
  };

  // ── Stage 4: Dynamic Tool Binding & Stream Generation ───────────────────
  // CRITICAL FIX: The model must be given the actual tool to execute the Canvas update.
  const toolsToBind = (subDomain === 'PRODUCT_SEARCH' || intent === 'TOOL_ACTION')
    ? { updateProductCanvas: agentTools.updateProductCanvas }
    : undefined;

  const result = streamText({
    model: getChatModel(),
    instructions: systemPrompt,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    tools: toolsToBind,          // <--- Bound to LLM
    toolChoice: 'auto',          // <--- Gives LLM autonomy
    temperature: CHAT_TEMPERATURE,
    topP: CHAT_TOP_P,
  });

  log.info('RAG pipeline stages completed', { duration: Date.now() - startTime });

  
  return { stream: result, context: ragContext };
}