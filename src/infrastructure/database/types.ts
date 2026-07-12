/**
 * MongoDB Database Types
 * 
 * Type definitions specific to the MongoDB data layer,
 * including document schemas, filter types, and the new
 * parent-child chunking schema and user memory types.
 * 
 * @module infrastructure/database/types
 */

import { ObjectId } from 'mongodb';

// ─── Product Types ──────────────────────────────────────────────────────────

/**
 * Raw MongoDB product document as stored in the collection.
 * Contains the embedding vector field used by Atlas Vector Search.
 */
export interface ProductDocument {
  _id: ObjectId;
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
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of a vector search operation,
 * includes the similarity score from Atlas Vector Search.
 */
export interface ProductSearchDocument extends Omit<ProductDocument, 'embedding'> {
  score: number;
}

/**
 * Optional filter criteria for narrowing vector search results.
 */
export interface ProductFilter {
  category?: string;
  subcategory?: string;
  gender?: 'men' | 'women' | 'unisex';
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  inStock?: boolean;
}

// ─── Document Chunk Types (Parent-Child Schema) ─────────────────────────────

/**
 * A semantic chunk of content parsed from an uploaded document.
 * Supports parent-child retrieval: for tables and images, the
 * vectorized `text` is a summary (child), and `parentContent`
 * holds the full raw Markdown (parent).
 */
export interface DocumentChunk {
  _id: ObjectId;
  /** Vectorized content — summary for child chunks, full text otherwise */
  text: string;
  /** Embedding vector for Atlas Vector Search */
  embedding: number[];
  /** Full raw Markdown content — populated for parent-child chunks */
  parentContent?: string;
  /** Content classification */
  chunkType: 'text' | 'table' | 'image_description' | 'heading_section';
  /** Heading hierarchy breadcrumb path */
  headingPath: string[];
  /** Chunk metadata */
  metadata: {
    filename: string;
    chunkId: number;
    timestamp: Date;
    fileType: string;
    hasTable: boolean;
    hasImage: boolean;
    /** True if `text` is a summary pointing to `parentContent` */
    isChildSummary: boolean;
  };
}

/**
 * Result of a vector search operation on document chunks.
 * For child summaries, the `parentContent` field contains the
 * full raw content that should be included in the LLM prompt.
 */
export interface DocumentSearchChunk extends Omit<DocumentChunk, 'embedding'> {
  score: number;
}

// ─── User Memory Types ──────────────────────────────────────────────────────

/**
 * MongoDB document for the user_memory_vectors collection.
 * Stores extracted permanent user traits as vectorized summaries.
 */
export interface UserMemoryDocument {
  _id: ObjectId;
  /** Client-generated session identifier */
  sessionId: string;
  /** Natural language summary of user preferences and traits */
  summary: string;
  /** Embedding vector of the summary for retrieval */
  embedding: number[];
  /** When this memory was last updated */
  lastUpdated: Date;
  /** Number of messages analyzed to produce this summary */
  messageCount: number;
}

/**
 * Result of a vector search on user memory.
 */
export interface UserMemorySearchResult extends Omit<UserMemoryDocument, 'embedding'> {
  score: number;
}

// ─── Chat History Types ─────────────────────────────────────────────────────

/**
 * A single message stored in the chat_history collection.
 */
export interface ChatHistoryMessage {
  _id: ObjectId;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
