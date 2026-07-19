/**
 * Ingestion Worker (Enterprise-Grade)
 * 
 * Inngest background function that processes document ingestion
 * asynchronously. Triggered by the `ingest/document.uploaded` event
 * dispatched from the /api/ingest route.
 * 
 * Architectural design for Vercel Free Tier (10s timeout):
 * 
 * 1. MERGED download+parse: Fetches from Supabase Storage and parses
 *    in a single step — returns only lightweight Markdown (no Base64).
 * 
 * 2. LOOP INVERSION for summarization: Complex chunks (tables/images)
 *    are batched in groups of 3 with the loop OUTSIDE step.run(),
 *    resetting the timeout clock after every batch.
 * 
 * 3. LOOP INVERSION for embeddings: Texts are batched in groups of 50
 *    with the loop OUTSIDE step.run(), enabling 100+ page documents.
 * 
 * Each step is individually retriable — if embedding fails,
 * it retries from that step, not from the beginning.
 * 
 * Pipeline: Download+Parse → Chunk → Summarize (batched) → Embed (batched) → Store
 * 
 * @module core/workers/ingestion-worker
 */

import { inngest } from '@/infrastructure/queue/inngest-client';
import { updateJobStatus } from '@/infrastructure/database/job-repository';
import { parseDocument } from '@/infrastructure/parsing/parser';
import { splitMarkdownIntoChunks, StructuredChunk } from '@/infrastructure/parsing/markdown-chunker';
import { generateChunkSummary } from '@/core/summarization-service';
import { getEmbeddings } from '@/infrastructure/nvidia/nvidia-client';
import { bulkInsertChunks, InsertDocumentChunk } from '@/infrastructure/database/document-repository';
import { createSignedDownloadUrl } from '@/infrastructure/storage/supabase-admin';
import { createLogger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

const log = createLogger('IngestionWorker');

/** Number of complex chunks to summarize per step (resets Vercel timeout) */
const SUMMARIZE_BATCH_SIZE = 3;

/** Number of texts to embed per step (resets Vercel timeout) */
const EMBED_BATCH_SIZE = 50;

/**
 * Inngest function definition for document ingestion.
 * Uses step functions with loop inversion for reliable, resumable execution
 * that scales infinitely within Vercel's 10-second serverless timeout.
 */
export const documentIngestionFunction = inngest.createFunction(
  {
    id: 'ingest-document',
    retries: 3,
    onFailure: async ({ event, error }) => {
      const jobId = event.data.event.data.jobId;
      log.error('Ingestion worker failed permanently', {
        jobId,
        error: error.message,
      });
      try {
        await updateJobStatus(jobId, 'failed', {
          error: `Ingestion failed: ${error.message}`,
          progress: 'Failed',
        });
      } catch {
        // Best-effort status update
      }
    },
    triggers: [{ event: 'ingest/document.uploaded' }],
  },
  async ({ event, step }) => {
    const { jobId, blobPath, filename, mimeType, fileSizeBytes } = event.data;

    log.info('Ingestion worker started', { jobId, filename, fileSizeBytes });

    // ── Step 1: Download from Supabase Storage + Parse (Merged) ──────────
    // Eliminates the Base64 payload crash by never serializing the raw buffer.
    // Downloads the file and immediately parses it with LlamaParse in a single
    // step, returning only the lightweight Markdown string.
    const markdown = await step.run('download-and-parse', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Downloading and parsing document',
      });

      // Generate a time-limited download URL from Supabase Storage
      log.info('Creating signed download URL', { jobId, blobPath });
      const downloadUrl = await createSignedDownloadUrl(blobPath);

      // Download the file
      log.info('Downloading file from storage', { jobId, blobPath });
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      log.info('File downloaded', { jobId, sizeBytes: buffer.length });

      // Parse immediately — no Base64 serialization
      log.info('Parsing document with LlamaParse', { jobId, filename });
      const result = await parseDocument(buffer, mimeType);

      log.info('Document downloaded and parsed', {
        jobId,
        markdownLength: result.length,
      });

      // Only the lightweight Markdown string crosses the step boundary
      return result;
    });

    // ── Step 2: Structural Chunking ───────────────────────────────────────
    const chunks = await step.run('chunk-document', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Splitting into semantic chunks',
      });

      log.info('Chunking document', { jobId, filename });
      const result = splitMarkdownIntoChunks(markdown, filename);

      log.info('Document chunked', { jobId, totalChunks: result.length });
      return result;
    });

    // ── Step 3: Summarize Complex Chunks (Loop Inversion) ────────────────
    // The loop is OUTSIDE step.run() so Vercel's timeout clock resets
    // after every batch of 3 LLM calls. This enables infinite page scaling.

    // Separate complex chunks (need LLM summarization) from plain text
    const complexChunkIndices: number[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].type === 'table' || chunks[i].type === 'image_description') {
        complexChunkIndices.push(i);
      }
    }

    // Build batches of complex chunk indices
    const summarizeBatches: number[][] = [];
    for (let i = 0; i < complexChunkIndices.length; i += SUMMARIZE_BATCH_SIZE) {
      summarizeBatches.push(complexChunkIndices.slice(i, i + SUMMARIZE_BATCH_SIZE));
    }

    // Start with a copy of chunks — plain text chunks pass through unchanged
    const summarizedChunks: StructuredChunk[] = [...chunks];

    // Process each batch in its own step (resets serverless timeout)
    for (let i = 0; i < summarizeBatches.length; i++) {
      const batchIndices = summarizeBatches[i];

      const batchResults = await step.run(`summarize-batch-${i}`, async () => {
        await updateJobStatus(jobId, 'processing', {
          progress: `Summarizing complex chunks (batch ${i + 1}/${summarizeBatches.length})`,
        });

        const results: { index: number; summary: string; originalContent: string }[] = [];

        for (const idx of batchIndices) {
          const chunk = chunks[idx];
          log.debug('Summarizing chunk', { chunkId: chunk.id, type: chunk.type });

          const summary = await generateChunkSummary(
            chunk.content,
            chunk.type as 'table' | 'image_description'
          );
          results.push({
            index: idx,
            summary,
            originalContent: chunk.content,
          });

          log.debug('Chunk summarized', {
            chunkId: chunk.id,
            type: chunk.type,
            summaryLength: summary.length,
          });
        }

        return results;
      });

      // Apply batch results to the working array
      for (const result of batchResults) {
        summarizedChunks[result.index] = {
          ...chunks[result.index],
          content: result.summary,
          parentContent: result.originalContent,
          metadata: {
            ...chunks[result.index].metadata,
            isChildSummary: true,
          },
        };
      }
    }

    log.info('Summarization completed', {
      jobId,
      totalBatches: summarizeBatches.length,
      summarized: complexChunkIndices.length,
    });

    // ── Step 4: Generate Embeddings (Loop Inversion) ─────────────────────
    // The loop is OUTSIDE step.run() so Vercel's timeout clock resets
    // after every batch of 50 embeddings. Guarantees the Nvidia API
    // never causes a function timeout on massive 100+ page documents.

    const texts = summarizedChunks.map(c => c.content);
    const allEmbeddings: number[][] = [];

    // Build batches of text indices
    const embedBatchCount = Math.ceil(texts.length / EMBED_BATCH_SIZE);

    for (let i = 0; i < embedBatchCount; i++) {
      const start = i * EMBED_BATCH_SIZE;
      const end = Math.min(start + EMBED_BATCH_SIZE, texts.length);

      const batchEmbeddings = await step.run(`embed-batch-${i}`, async () => {
        await updateJobStatus(jobId, 'processing', {
          progress: `Generating embeddings (batch ${i + 1}/${embedBatchCount})`,
        });

        const batch = texts.slice(start, end);
        log.info(`Embedding batch ${i + 1}/${embedBatchCount}`, {
          jobId,
          batchSize: batch.length,
        });

        const embeddings = await getEmbeddings(batch, 'passage');
        log.info(`Embedding batch ${i + 1} complete`, {
          jobId,
          count: embeddings.length,
        });

        return embeddings;
      });

      allEmbeddings.push(...batchEmbeddings);
    }

    log.info('All embeddings generated', {
      jobId,
      totalBatches: embedBatchCount,
      totalEmbeddings: allEmbeddings.length,
    });

    // ── Step 5: Store in MongoDB ──────────────────────────────────────────
    const result = await step.run('store-chunks', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Storing in knowledge base',
      });

      const timestamp = new Date();
      const documentChunks: InsertDocumentChunk[] = summarizedChunks.map((chunk, index) => ({
        _id: new ObjectId(),
        text: chunk.content,
        embedding: allEmbeddings[index],
        parentContent: chunk.parentContent,
        chunkType: chunk.type,
        headingPath: chunk.headingPath,
        metadata: {
          filename,
          chunkId: index + 1,
          timestamp,
          fileType: mimeType,
          hasTable: chunk.metadata.hasTable,
          hasImage: chunk.metadata.hasImage,
          isChildSummary: chunk.metadata.isChildSummary,
        },
      }));

      await bulkInsertChunks(documentChunks);

      const result = {
        chunksProcessed: documentChunks.length,
        tokensEstimated: Math.round(
          summarizedChunks.reduce((acc, c) => acc + c.content.length, 0) / 4
        ),
      };

      log.info('Chunks stored in database', { jobId, ...result });
      return result;
    });

    // ── Step 6: Mark Complete ─────────────────────────────────────────────
    await step.run('update-status', async () => {
      await updateJobStatus(jobId, 'completed', {
        progress: 'Indexed successfully',
        result,
      });

      log.info('Ingestion job completed', { jobId, ...result });
    });

    return { jobId, ...result };
  }
);
