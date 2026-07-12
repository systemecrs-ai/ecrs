/**
 * Core Domain Types
 * 
 * TypeScript interfaces for the RAG pipeline domain model.
 * These types are infrastructure-agnostic and define the
 * contract between the core business logic and the API layer.
 * 
 * Includes types for products, documents, user memory, and
 * the triple-retrieval RAG context.
 * 
 * @module core/types
 */

// ─── Chat Message Types ─────────────────────────────────────────────────────

/**
 * Role of a participant in the conversation.
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in the chat conversation.
 */
export interface Message {
  role: MessageRole;
  content: string;
}

// ─── Product Domain Types ───────────────────────────────────────────────────

/**
 * Core product entity in the domain layer.
 * Mapped from the database ProductDocument, sans MongoDB-specific fields.
 */
export interface Product {
  id: string;
  sku?: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  currency: string;
  colors: string[];
  sizes: string[];
  material: string;
  gender: 'men' | 'women' | 'unisex';
  imageUrl: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
}

/**
 * A product with a similarity score from vector search.
 */
export interface ProductSearchResult extends Product {
  /** Cosine similarity score from MongoDB Atlas Vector Search (0-1) */
  score: number;
}

// ─── Document Search Types ──────────────────────────────────────────────────

/**
 * A document chunk retrieved from vector search.
 * For parent-child chunks, `parentContent` contains the full
 * raw content while `text` is the searchable summary.
 */
export interface DocumentSearchResult {
  id: string;
  /** Vectorized content (summary for child chunks, full text otherwise) */
  text: string;
  /** Full raw Markdown for parent-child chunks */
  parentContent?: string;
  /** Content classification */
  chunkType: string;
  /** Heading hierarchy breadcrumb */
  headingPath: string[];
  /** Cosine similarity score */
  score: number;
  /** Chunk metadata */
  metadata: {
    filename: string;
    chunkId: number;
    hasTable: boolean;
    hasImage: boolean;
    isChildSummary: boolean;
  };
}

// ─── User Memory Types ──────────────────────────────────────────────────────

/**
 * User memory summary retrieved for the current session.
 */
export interface UserMemory {
  sessionId: string;
  summary: string;
  lastUpdated: Date;
}

// ─── RAG Pipeline Types ─────────────────────────────────────────────────────

/**
 * Intermediate context object carrying data between RAG pipeline stages.
 * Now includes document chunks and user memory for triple-retrieval.
 */
export interface RAGContext {
  /** The original user query */
  userQuery: string;
  /** The embedding vector of the user's query */
  queryEmbedding: number[];
  /** Products retrieved from vector search */
  retrievedProducts: ProductSearchResult[];
  /** Document chunks retrieved from vector search */
  retrievedDocuments: DocumentSearchResult[];
  /** User memory summary (null if no memory exists) */
  userMemory: string | null;
  /** The assembled system prompt with all context */
  systemPrompt: string;
}

// ─── API Contract Types ─────────────────────────────────────────────────────

/**
 * Incoming chat request from the frontend.
 * Compatible with Vercel AI SDK's useChat() hook.
 */
export interface ChatRequest {
  /** Array of conversation messages (user + assistant history) */
  messages: Message[];
  /** Client session identifier for memory/history tracking */
  sessionId?: string;
}

/**
 * Metadata attached to streamed responses for frontend rendering.
 */
export interface ChatResponseMetadata {
  /** Products that were used as context for this response */
  retrievedProducts: ProductSearchResult[];
  /** Document chunks used as context */
  retrievedDocuments: DocumentSearchResult[];
  /** Whether user memory was included */
  hasUserMemory: boolean;
  /** Number of products found in vector search */
  totalResults: number;
  /** Time taken for the RAG pipeline in milliseconds */
  pipelineDurationMs: number;
}

// ─── Data Seeding Types ─────────────────────────────────────────────────────

/**
 * Product data used for seeding the database (without ID or embedding).
 */
export interface ProductSeedData {
  sku?: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  currency: string;
  colors: string[];
  sizes: string[];
  material: string;
  gender: 'men' | 'women' | 'unisex';
  imageUrl: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
}
