# StyleAI Architecture Documentation

## System Overview
The StyleAI system is an enterprise-grade, zero-hallucination Retrieval-Augmented Generation (RAG) pipeline designed for an intelligent apparel shopping assistant. The architecture prioritizes extremely low-latency responses, cost efficiency, and strict tenant data isolation. To achieve this, it relies on semantic cache interception, multi-tiered retrieval, and asynchronous background processing, orchestrated by the Vercel AI SDK.

## System Architecture & Tiers

### Presentation Tier (Frontend)
The frontend is built with Next.js and operates across three primary UI regions (managed by a Split View layout in `page.tsx`):
- **Main Workspace / Chat Sidebar**: The left-hand navigation and thread selection pane (`ChatSidebar`).
- **Collapsible Chat Drawer**: A persistent, sliding drawer interface (`ChatInterface` wrapped in Framer Motion) for the StyleAI assistant.
- **Product Canvas**: A dedicated, central view (`ProductCanvas`) for rendering rich product cards and details.
The frontend natively consumes Vercel AI SDK streams (e.g., via `useChat`), allowing real-time, token-by-token rendering of the LLM response and dynamic UI component updates.

### Authentication & Storage (Supabase)
The system employs a strict zero-trust architecture powered by Supabase:
- **Identity & API Security**: Supabase handles user authentication. The resulting Supabase JWTs are validated for every API route, ensuring secure, authorized access and preventing unauthorized invocation.
- **Direct-to-Cloud Storage**: For document and media ingestion, the client application uploads binaries directly to Supabase Storage buckets. This bypasses the server entirely, significantly reducing bandwidth load and latency before triggering the background ingestion pipeline.

## Core Technology Stack
- **Frameworks**: Next.js, Vercel AI SDK (v7) for streaming interfaces.
- **AI Models & Endpoints**:
  - **Fast LLM**: `meta/llama-3.1-8b-instruct` (Nvidia NIM endpoint) — Used for lightweight tasks like intent routing, caching verification, and casual conversations.
  - **Heavy LLM**: `meta/llama-3.1-70b-instruct` (Nvidia NIM endpoint) — Used for complex reasoning and generating the final response with full RAG context.
  - **Embedding Model**: Nvidia Nemotron (2048 dimensions).
  - **Reranker**: Cohere (`rerank-english-v3.0`).
- **Database**: MongoDB Atlas with `$vectorSearch`.
- **Observability**: Langfuse (for AI tracing and evaluations).

## Database Architecture
The application leverages MongoDB Atlas with specific collections designed for scalable vector search and data persistence. To prevent connection exhaustion in serverless environments, the system strictly implements a **Global Connection Pool Singleton** pattern. This ensures that a single, persistent MongoDB client is reused across warm serverless invocations.

- **`semantic_cache`**: Stores previously generated answers along with their query embeddings (2048-d). It features an Atlas Vector Search index (`semantic_cache_vector_index`) for similarity matching and a native database-level TTL (Time-To-Live) index on the `createdAt` field for automatic expiration.
- **`unified_nodes` (Product Chunks & User Memory)**: A polymorphic collection storing vectorized `product`, `document`, and `memory` documents. It utilizes a unified Atlas Vector Search index (`unified_vector_index`).
- **`chat_history`**: Persists chronological conversation messages. Documents strictly enforce tenant isolation using `userId` and `threadId` compound filtering.

## The Request Lifecycle (The Pipeline Flow)

When a POST request arrives at `/api/chat`, it executes the following strictly controlled lifecycle:

### Phase 1: Context Isolation
Before domain logic executes, the system establishes a secure request context using Node's `AsyncLocalStorage` (`runWithContext`). The Supabase-verified `userId` and conversation `threadId` are threaded through the entire call stack implicitly. This ensures deep infrastructure layers (like the chat history repository) can enforce tenant isolation without polluting intermediate function signatures.

### Phase 2: Intent Routing (Front-Door Classification)
The request is immediately classified using the fast 8B model. The LLM determines if the intent is `CASUAL` (small talk, greetings) or `RAG` (product searches, policy questions). If classified as `CASUAL`, the system streams a lightweight response from the 8B model and immediately exits, saving the 70B model's compute for heavy RAG operations.

### Phase 3: Two-Tier Semantic Caching
If the intent is `RAG`, the system attempts a cache interception to prevent redundant LLM generation:
1. **Vector Similarity**: Generates a 2048-d query embedding and performs a MongoDB `$vectorSearch` against the `semantic_cache` collection with a cosine similarity threshold of 0.70.
2. **LLM Verification**: If a candidate is found, it is sent to the 8B model to explicitly verify if the original cached query and the new query ask for the exact same underlying information.
If verified, the cached answer is chunked and streamed back using `simulateReadableStream`, completely bypassing the heavy RAG pipeline.

### Phase 4: Triple-Retrieval
On a cache miss, the pipeline transitions to a parallelized retrieval phase:
- **Products**: Executes a hybrid search against the products collection. This leverages a **Reciprocal Rank Fusion (RRF)** engine to intelligently merge BM25 (exact keyword match) and Vector (semantic similarity) search results, ensuring high recall for both specific SKUs and conceptual queries before passing candidates to the cross-encoder.
- **Documents**: Executes a vector search against the policy/document chunks.
- **User Memory**: Executes a vector search against the user's vectorized long-term memory summaries (filtered strictly by `userId`).
These searches execute concurrently via `Promise.all` to minimize latency.

### Phase 5: Reranking, Tool Calling & Generation (ReAct Engine)
1. **Reranking**: Product and document candidates are merged and sent to the Cohere reranker (`rerank-english-v3.0`). The top 5 semantically dense chunks are retained. If the reranker fails, the system gracefully falls back to the original vector search results.
2. **Generation & Tool Execution (The ReAct Loop)**: A comprehensive system prompt is constructed using the triple context (Products, Documents, User Memory) and injected with **ReAct Engine** instructions. The `streamText` function from the Vercel AI SDK invokes the 70B model with a suite of enterprise tools (e.g., `checkInventory`, `fetchOrderStatus`, `reserveItemInStore`).
   - **Type-Safe Tool Layer**: All tools enforce strict Zod schemas and are wrapped in safe execution handlers that catch exceptions and return a standardized `AgentToolResult`.
   - **Circuit Breakers**: The engine enforces a hard limit of `maxSteps: 5` to prevent infinite reasoning loops, and utilizes an `AbortSignal.timeout(15000)` to ensure execution does not exceed a 15-second ceiling.
   - **Human-in-the-Loop (HITL)**: For write/action tools like `reserveItemInStore`, the backend safely halts database mutations unless an explicit `confirmed: true` flag is received. It returns a `hitlRequired` payload to the client.
   - **Tool Observability & UI Rendering**: The client application dynamically renders loading indicators for active tools and an interactive Confirmation Card for HITL events. User approvals send a callback to the API route, seamlessly resuming the ReAct loop.

### Phase 6: Asynchronous Operations (Background Jobs)
Once the streaming response is initiated, the system detaches asynchronous background operations (fire-and-forget) to ensure zero impact on user latency:
- **Cache Writing**: Upon completion, the new query, embedding, and generated text are stored in the `semantic_cache`.
- **History Saving**: The user's query and the assistant's complete response are appended to the `chat_history`.
- **Memory Summarization**: A trigger (`maybeDispatchMemorySummarization`) evaluates if the user's conversation volume warrants generating a new long-term memory profile. 

## Additional Asynchronous Pipelines (Inngest)

Beyond the main chat lifecycle, the system operates two major background pipelines powered by Inngest to handle heavy processing without blocking the API:

### 1. Document Ingestion Pipeline
Used for processing new policy documents or product catalogs.
1. **Direct Upload**: Files are uploaded directly to Supabase Storage by the client (bypassing the server).
2. **Metadata API**: The client calls `POST /api/ingest` with the file metadata (e.g., `blobPath`). The API creates a tracking job and instantly dispatches an Inngest event (`ingest/document.uploaded`), returning a 202 Accepted.
3. **Background Worker Processing**:
   - **Parsing**: Extracts structured Markdown using LlamaParse.
   - **Chunking**: Splits the document into Markdown-aware structural chunks.
   - **Complex Summarization (Parent-Child Strategy)**: Uses the fast 8B model to generate concise summaries for complex chunks like tables and image descriptions. The summary is vectorized for search, while the raw table/image data is retained as "parent content" to pass to the 70B model.
   - **Embedding**: Generates embeddings in batches of 50 via Nvidia Nemotron.
   - **Storage**: Bulk inserts the chunks into the `unified_nodes` MongoDB collection.

### 2. Background Memory Summarization
Used to build long-term user profiles for personalized RAG responses.
1. **Trigger Evaluation**: After every chat message, `maybeDispatchMemorySummarization` checks the user's total message count. 
2. **Dispatch**: If the count hits a predefined threshold (every 5 messages), it fires a `memory/summarize.requested` Inngest event.
3. **Worker Processing**: The Inngest worker retrieves the user's full cross-thread chat history, prompts the LLM to extract permanent user traits/preferences, vectorizes the resulting summary, and upserts it into the `unified_nodes` collection (with type `memory`).

## Engineering Guardrails & Trade-offs
- **Fail-Safe Mechanisms**: Auxiliary operations like cache checking, caching saving, and memory retrieval catch their own exceptions and fail silently. This ensures that transient database or network errors do not break the core RAG generation pipeline.
- **Strict Tenant Isolation**: `userId` is enforced at the database query level for history and memory, combined with `AsyncLocalStorage` to guarantee cross-tenant data cannot leak during concurrent requests.
- **Vector Cache Bloat Protection**: The TTL index in MongoDB ensures the semantic cache self-prunes old entries, maintaining high performance and preventing infinite growth.
- **Reranker Trade-off**: Adding a reranker introduces slight latency but significantly reduces hallucinations by narrowing the context window down to only the most relevant snippets for the 70B generation model.
