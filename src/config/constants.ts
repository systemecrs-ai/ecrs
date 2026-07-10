/**
 * Application Constants
 * 
 * Centralized constants for RAG pipeline configuration,
 * vector search parameters, and retry policies.
 * 
 * @module config/constants
 */

// ─── MongoDB Vector Search ──────────────────────────────────────────────────

/** Name of the MongoDB collection storing product documents */
export const PRODUCTS_COLLECTION = 'products';

/** Name of the Atlas Vector Search index */
export const VECTOR_SEARCH_INDEX = 'product_vector_index';

/** Field path containing the embedding vector in product documents */
export const VECTOR_FIELD_PATH = 'embedding';

/** Number of candidate vectors to consider during ANN search (10:1 ratio to limit) */
export const VECTOR_NUM_CANDIDATES = 150;

/** Default number of results to return from vector search */
export const VECTOR_SEARCH_LIMIT = 10;

/** Name of the MongoDB collection storing ingested documents */
export const DOCUMENTS_COLLECTION = 'document_chunks';

/** Name of the Atlas Vector Search index for documents */
export const DOCUMENTS_VECTOR_SEARCH_INDEX = 'document_vector_index';

/** Maximum character length for a semantic document chunk */
export const CHUNK_MAX_CHARS = 2000;

/** Dimensionality of nvidia/llama-nemotron-embed-1b-v2 embeddings */
export const EMBEDDING_DIMENSIONS = 1024;

/** Maximum number of document chunks to retrieve per query */
export const DOCUMENT_SEARCH_LIMIT = 5;

// ─── User Memory ────────────────────────────────────────────────────────────

/** Name of the MongoDB collection storing user memory vectors */
export const USER_MEMORY_COLLECTION = 'user_memory_vectors';

/** Name of the Atlas Vector Search index for user memory */
export const USER_MEMORY_VECTOR_INDEX = 'user_memory_vector_index';

/** Maximum number of memory vectors to retrieve per query */
export const MEMORY_SEARCH_LIMIT = 3;

/** Trigger memory summarization every N messages */
export const MEMORY_TRIGGER_INTERVAL = 5;

// ─── Chat History ───────────────────────────────────────────────────────────

/** Name of the MongoDB collection storing chat history */
export const CHAT_HISTORY_COLLECTION = 'chat_history';

// ─── Ingestion Jobs ─────────────────────────────────────────────────────────

/** Name of the MongoDB collection tracking ingestion job status */
export const INGESTION_JOBS_COLLECTION = 'ingestion_jobs';

/** Polling interval for ingestion status (ms) */
export const INGESTION_STATUS_POLL_INTERVAL_MS = 2000;

// ─── Nvidia NIM API ─────────────────────────────────────────────────────────

/** Maximum tokens for chat completion responses */
export const MAX_COMPLETION_TOKENS = 4096;

/** Temperature for chat completions (lower = more deterministic) */
export const CHAT_TEMPERATURE = 0.7;

/** Top-p (nucleus sampling) parameter */
export const CHAT_TOP_P = 0.95;

// ─── Retry Policy ───────────────────────────────────────────────────────────

/** Base delay in milliseconds for exponential backoff */
export const RETRY_BASE_DELAY_MS = 1000;

/** Maximum number of retry attempts */
export const RETRY_MAX_ATTEMPTS = 3;

/** Multiplier for exponential backoff (delay = base * factor^attempt) */
export const RETRY_BACKOFF_FACTOR = 2;

/** Maximum delay cap in milliseconds */
export const RETRY_MAX_DELAY_MS = 10000;

// ─── Application ────────────────────────────────────────────────────────────

/** Application name displayed in the UI */
export const APP_NAME = 'StyleAI';

/** Application tagline */
export const APP_TAGLINE = 'Your Intelligent Apparel Shopping Assistant';

/** Suggested queries displayed as chips in the chat UI */
export const SUGGESTED_QUERIES = [
  'Find me a summer dress under $80',
  "Men's formal shirts in navy blue",
  'Comfortable workout leggings',
  'Casual weekend outfit ideas',
  'Winter jackets with good insulation',
  'Trendy sneakers for everyday wear',
] as const;
