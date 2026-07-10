/**
 * Ingestion Worker
 * 
 * Inngest background function that processes document ingestion
 * asynchronously. Triggered by the `ingest/document.uploaded` event
 * dispatched from the /api/ingest route.
 * 
 * Each step is individually retriable — if embedding fails,
 * it retries from that step, not from the beginning.
 * 
 * Pipeline: Download → Parse → Chunk → Summarize → Embed → Store
 * 
 * @module core/workers/ingestion-worker
 */

import { inngest } from '@/infrastructure/queue/inngest-client';
import { updateJobStatus } from '@/infrastructure/database/job-repository';
import { parseDocument } from '@/infrastructure/parsing/parser';
import { splitMarkdownIntoChunks, StructuredChunk } from '@/infrastructure/parsing/markdown-chunker';
import { generateChunkSummary } from '@/core/summarization-service';
import { getEmbeddings } from '@/infrastructure/nvidia/nvidia-client';
import { bulkInsertChunks } from '@/infrastructure/database/document-repository';
import { DocumentChunk } from '@/infrastructure/database/types';
import { createLogger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

const log = createLogger('IngestionWorker');

/**
 * Inngest function definition for document ingestion.
 * Uses step functions for reliable, resumable execution.
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
    const { jobId, blobUrl, filename, mimeType, fileSizeBytes } = event.data;

    log.info('Ingestion worker started', { jobId, filename, fileSizeBytes });

    // ── Step 1: Download from Blob ────────────────────────────────────────
    const fileBuffer = await step.run('download-blob', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Downloading file from storage',
      });

      log.info('Downloading file from blob storage', { jobId, blobUrl });
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to download blob: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      log.info('File downloaded', { jobId, sizeBytes: arrayBuffer.byteLength });

      // Return as base64 since Inngest step results must be serializable
      return Buffer.from(arrayBuffer).toString('base64');
    });

    // ── Step 2: Parse Document (LlamaParse) ───────────────────────────────
    const markdown = await step.run('parse-document', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Parsing document with AI vision',
      });

      log.info('Parsing document with LlamaParse', { jobId, filename });
      const buffer = Buffer.from(fileBuffer, 'base64');
      const result = await parseDocument(buffer, mimeType);

      log.info('Document parsed', { jobId, markdownLength: result.length });
      return result;
    });

    // ── Step 3: Structural Chunking ───────────────────────────────────────
    const chunks = await step.run('chunk-document', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Splitting into semantic chunks',
      });

      log.info('Chunking document', { jobId, filename });
      const result = splitMarkdownIntoChunks(markdown, filename);

      log.info('Document chunked', { jobId, totalChunks: result.length });
      return result;
    });

    // ── Step 4: Summarize Complex Chunks ──────────────────────────────────
    const summarizedChunks = await step.run('summarize-chunks', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Generating summaries for tables and images',
      });

      const result: StructuredChunk[] = [];

      for (const chunk of chunks) {
        if (chunk.type === 'table' || chunk.type === 'image_description') {
          // Generate a summary for complex chunks (parent-child)
          const summary = await generateChunkSummary(chunk.content, chunk.type);
          result.push({
            ...chunk,
            content: summary, // Vectorize the summary (child)
            parentContent: chunk.content, // Keep raw content (parent)
            metadata: {
              ...chunk.metadata,
              isChildSummary: true,
            },
          });
          log.debug('Chunk summarized', {
            chunkId: chunk.id,
            type: chunk.type,
            summaryLength: summary.length,
          });
        } else {
          result.push(chunk);
        }
      }

      log.info('Summarization completed', {
        jobId,
        summarized: result.filter(c => c.metadata.isChildSummary).length,
      });
      return result;
    });

    // ── Step 5: Generate Embeddings ───────────────────────────────────────
    const embeddings = await step.run('embed-chunks', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Generating vector embeddings',
      });

      log.info('Generating embeddings', { jobId, chunkCount: summarizedChunks.length });

      const texts = summarizedChunks.map(c => c.content);
      const allEmbeddings: number[][] = [];
      const BATCH_SIZE = 50;

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        log.debug(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}`, {
          batchSize: batch.length,
        });
        const batchEmbeddings = await getEmbeddings(batch, 'passage');
        allEmbeddings.push(...batchEmbeddings);
      }

      log.info('Embeddings generated', { jobId, count: allEmbeddings.length });
      return allEmbeddings;
    });

    // ── Step 6: Store in MongoDB ──────────────────────────────────────────
    const result = await step.run('store-chunks', async () => {
      await updateJobStatus(jobId, 'processing', {
        progress: 'Storing in knowledge base',
      });

      const timestamp = new Date();
      const documentChunks: DocumentChunk[] = summarizedChunks.map((chunk, index) => ({
        _id: new ObjectId(),
        text: chunk.content,
        embedding: embeddings[index],
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

    // ── Step 7: Mark Complete ─────────────────────────────────────────────
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
