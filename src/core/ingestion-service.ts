/**
 * Ingestion Service
 * 
 * Orchestrates the document ingestion pipeline. This service is
 * now called exclusively by the Inngest ingestion worker, NOT
 * by the API route directly.
 * 
 * The pipeline:
 * 1. Parse: Extract structured Markdown via LlamaParse
 * 2. Chunk: Split into Markdown-aware structural chunks
 * 3. Summarize: Generate summaries for tables/images (parent-child)
 * 4. Embed: Generate vector embeddings via Nvidia NIM
 * 5. Store: Bulk insert chunks into MongoDB Atlas
 * 
 * @module core/ingestion-service
 */

import { parseDocument } from '@/infrastructure/parsing/parser';
import { splitMarkdownIntoChunks, StructuredChunk } from '@/infrastructure/parsing/markdown-chunker';
import { generateChunkSummary } from '@/core/summarization-service';
import { getEmbeddings } from '@/infrastructure/nvidia/nvidia-client';
import { bulkInsertChunks } from '@/infrastructure/database/document-repository';
import { DocumentChunk } from '@/infrastructure/database/types';
import { createLogger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

const log = createLogger('IngestionService');

export interface IngestionResult {
  filename: string;
  chunksProcessed: number;
  tokensEstimated: number;
}

/**
 * Processes an uploaded document through the full ingestion pipeline.
 * 
 * Now uses LlamaParse for multimodal extraction and Markdown-aware
 * chunking with parent-child relationships for tables and images.
 * 
 * @param buffer - Raw file buffer
 * @param filename - Name of the uploaded file
 * @param mimeType - MIME type (application/pdf or text/plain)
 * @returns Summary of the ingestion process
 */
export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<IngestionResult> {
  log.info('Starting document ingestion pipeline', { filename, mimeType });
  const startTime = Date.now();

  // 1. Parse document to structured Markdown
  log.info('Stage 1: Parsing document with LlamaParse');
  const markdown = await parseDocument(buffer, mimeType);

  // 2. Split into structural chunks
  log.info('Stage 2: Structural chunking');
  const structuredChunks = splitMarkdownIntoChunks(markdown, filename);
  log.info('Text chunked', { totalChunks: structuredChunks.length });

  if (structuredChunks.length === 0) {
    return { filename, chunksProcessed: 0, tokensEstimated: 0 };
  }

  // 3. Summarize complex chunks (tables/images)
  log.info('Stage 3: Summarizing complex chunks');
  const processedChunks = await summarizeComplexChunks(structuredChunks);

  // 4. Generate embeddings
  log.info('Stage 4: Generating embeddings');
  const texts = processedChunks.map(c => c.content);
  const embeddings: number[][] = [];
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    log.debug(`Embedding batch ${i / BATCH_SIZE + 1}`, { batchSize: batch.length });
    const batchEmbeddings = await getEmbeddings(batch, 'passage');
    embeddings.push(...batchEmbeddings);
  }

  // 5. Store in database
  log.info('Stage 5: Injecting into database');
  const timestamp = new Date();
  
  const documentChunks: DocumentChunk[] = processedChunks.map((chunk, index) => ({
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

  const durationMs = Date.now() - startTime;
  log.info('Ingestion pipeline completed', {
    filename,
    chunks: documentChunks.length,
    durationMs,
  });

  return {
    filename,
    chunksProcessed: documentChunks.length,
    tokensEstimated: Math.round(
      processedChunks.reduce((acc, c) => acc + c.content.length, 0) / 4
    ),
  };
}

// ─── Private Helpers ────────────────────────────────────────────────────────

/**
 * Generates summaries for complex chunks (tables, images).
 * Plain text chunks pass through unchanged.
 */
async function summarizeComplexChunks(
  chunks: StructuredChunk[]
): Promise<StructuredChunk[]> {
  const result: StructuredChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.type === 'table' || chunk.type === 'image_description') {
      const summary = await generateChunkSummary(chunk.content, chunk.type);
      result.push({
        ...chunk,
        content: summary,
        parentContent: chunk.content,
        metadata: {
          ...chunk.metadata,
          isChildSummary: true,
        },
      });
    } else {
      result.push(chunk);
    }
  }

  return result;
}
