/**
 * Memory Repository
 * 
 * Data access layer for the user_memory_vectors collection.
 * Stores and retrieves vectorized user preference summaries
 * for long-term memory in the RAG pipeline.
 * 
 * @module infrastructure/database/memory-repository
 */

import { getDatabase } from './mongodb-client';
import { UserMemoryDocument, UserMemorySearchResult } from './types';
import {
  USER_MEMORY_COLLECTION,
  USER_MEMORY_VECTOR_INDEX,
  VECTOR_FIELD_PATH,
  VECTOR_NUM_CANDIDATES,
  MEMORY_SEARCH_LIMIT,
} from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';
import { ObjectId, Document } from 'mongodb';

const log = createLogger('MemoryRepository');

/**
 * Upserts a user memory summary into the database.
 * If a memory for this session already exists, it is replaced.
 * 
 * @param sessionId - The client session identifier
 * @param summary - Natural language summary of user traits
 * @param embedding - Vectorized embedding of the summary
 * @param messageCount - Number of messages analyzed
 */
export async function upsertUserMemory(
  sessionId: string,
  summary: string,
  embedding: number[],
  messageCount: number
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserMemoryDocument>(USER_MEMORY_COLLECTION);

    log.info('Upserting user memory', { sessionId, summaryLength: summary.length });

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          summary,
          embedding,
          lastUpdated: new Date(),
          messageCount,
        },
        $setOnInsert: {
          _id: new ObjectId(),
        },
      },
      { upsert: true }
    );

    log.info('User memory upserted successfully', { sessionId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to upsert user memory', { sessionId, error: err.message });
    throw new DatabaseError(`Failed to upsert user memory: ${err.message}`, err);
  }
}

/**
 * Performs a vector similarity search on user memory.
 * Filters by sessionId to only retrieve memories for the current user.
 * 
 * @param sessionId - The client session identifier
 * @param queryEmbedding - The query embedding vector
 * @param limit - Maximum number of results
 * @returns Array of matching memory documents
 */
export async function searchUserMemory(
  sessionId: string,
  queryEmbedding: number[],
  limit: number = MEMORY_SEARCH_LIMIT
): Promise<UserMemorySearchResult[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserMemoryDocument>(USER_MEMORY_COLLECTION);

    log.info('Searching user memory', { sessionId, limit });

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: USER_MEMORY_VECTOR_INDEX,
          path: VECTOR_FIELD_PATH,
          queryVector: queryEmbedding,
          numCandidates: VECTOR_NUM_CANDIDATES,
          limit,
          filter: { sessionId },
        },
      },
      {
        $project: {
          _id: 1,
          sessionId: 1,
          summary: 1,
          lastUpdated: 1,
          messageCount: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate<UserMemorySearchResult>(pipeline).toArray();

    log.info('User memory search completed', {
      sessionId,
      resultCount: results.length,
      topScore: results[0]?.score ?? 0,
    });

    return results;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('User memory search failed', { sessionId, error: err.message });
    // Gracefully return empty — memory is non-critical
    return [];
  }
}

/**
 * Retrieves user memory by session ID (non-vector, exact match).
 * Used by the memory worker to check if memory already exists.
 * 
 * @param sessionId - The client session identifier
 * @returns The memory document or null
 */
export async function getUserMemoryBySession(
  sessionId: string
): Promise<UserMemoryDocument | null> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserMemoryDocument>(USER_MEMORY_COLLECTION);
    return await collection.findOne({ sessionId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch user memory', { sessionId, error: err.message });
    return null;
  }
}
