/**
 * Document Repository
 * 
 * Data access layer for document chunks, providing bulk inserts
 * and vector search with parent-child retrieval support.
 * 
 * For child summary chunks, the search returns `parentContent`
 * (the full raw table/image) for LLM grounding while matching
 * against the shorter, vectorized summary.
 * 
 * @module infrastructure/database/document-repository
 */

import { getDatabase } from './mongodb-client';
import { DocumentChunk, DocumentSearchChunk } from './types';
import {
  DOCUMENTS_COLLECTION,
  DOCUMENTS_VECTOR_SEARCH_INDEX,
  VECTOR_FIELD_PATH,
  VECTOR_NUM_CANDIDATES,
  DOCUMENT_SEARCH_LIMIT,
} from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';
import { Document } from 'mongodb';

const log = createLogger('DocumentRepository');

/**
 * Safely inserts a batch of document chunks into the database.
 * Supports both regular text chunks and parent-child chunks.
 * 
 * @param chunks - Array of DocumentChunk objects to insert
 * @throws {DatabaseError} If the bulk insert operation fails
 */
export async function bulkInsertChunks(chunks: DocumentChunk[]): Promise<void> {
  if (!chunks.length) return;

  try {
    const db = await getDatabase();
    const collection = db.collection<DocumentChunk>(DOCUMENTS_COLLECTION);
    
    log.info('Bulk inserting document chunks', {
      count: chunks.length,
      childSummaries: chunks.filter(c => c.metadata.isChildSummary).length,
      tables: chunks.filter(c => c.chunkType === 'table').length,
    });
    
    await collection.insertMany(chunks, { ordered: false });
    
    log.info('Successfully inserted document chunks', { count: chunks.length });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Bulk insert failed', { error: err.message });
    throw new DatabaseError(`Failed to insert document chunks: ${err.message}`, err);
  }
}

/**
 * Performs a vector similarity search on the document chunks collection.
 * 
 * Returns chunks ranked by similarity. For child summary chunks,
 * includes the `parentContent` field containing the full raw content.
 * 
 * @param queryEmbedding - The embedding vector of the user's query
 * @param limit - Maximum number of results to return
 * @returns Array of document chunks ranked by similarity score
 * 
 * @throws {DatabaseError} If the aggregation pipeline fails
 */
export async function searchDocumentChunks(
  queryEmbedding: number[],
  limit: number = DOCUMENT_SEARCH_LIMIT
): Promise<DocumentSearchChunk[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<DocumentChunk>(DOCUMENTS_COLLECTION);

    log.info('Executing document vector search', {
      embeddingLength: queryEmbedding.length,
      limit,
    });

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: DOCUMENTS_VECTOR_SEARCH_INDEX,
          path: VECTOR_FIELD_PATH,
          queryVector: queryEmbedding,
          numCandidates: VECTOR_NUM_CANDIDATES,
          limit,
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          parentContent: 1,
          chunkType: 1,
          headingPath: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate<DocumentSearchChunk>(pipeline).toArray();

    log.info('Document vector search completed', {
      resultCount: results.length,
      topScore: results[0]?.score ?? 0,
      parentChildResults: results.filter(r => r.metadata?.isChildSummary).length,
    });

    return results;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Document vector search failed', { error: err.message });
    throw new DatabaseError(`Document vector search failed: ${err.message}`, err);
  }
}
