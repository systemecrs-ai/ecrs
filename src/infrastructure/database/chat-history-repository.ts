/**
 * Chat History Repository
 * 
 * Data access layer for the chat_history collection.
 * Persists conversation messages for the memory worker
 * to analyze and extract permanent user traits.
 * 
 * @module infrastructure/database/chat-history-repository
 */

import { getDatabase } from './mongodb-client';
import { ChatHistoryMessage } from './types';
import { CHAT_HISTORY_COLLECTION } from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';
import { ObjectId } from 'mongodb';

const log = createLogger('ChatHistoryRepository');

/**
 * Appends a single message to the chat history for a session.
 * 
 * @param sessionId - The client session identifier
 * @param role - Message role ('user' or 'assistant')
 * @param content - Message text content
 */
export async function appendMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<ChatHistoryMessage>(CHAT_HISTORY_COLLECTION);

    await collection.insertOne({
      _id: new ObjectId(),
      sessionId,
      role,
      content,
      timestamp: new Date(),
    });

    log.debug('Chat message appended', { sessionId, role });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to append chat message', { sessionId, error: err.message });
    // Non-critical — don't throw, just log
  }
}

/**
 * Retrieves the most recent messages for a session.
 * 
 * @param sessionId - The client session identifier
 * @param limit - Maximum number of messages to retrieve (default: 20)
 * @returns Array of chat messages, most recent last
 */
export async function getRecentMessages(
  sessionId: string,
  limit: number = 20
): Promise<ChatHistoryMessage[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<ChatHistoryMessage>(CHAT_HISTORY_COLLECTION);

    const messages = await collection
      .find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch recent messages', { sessionId, error: err.message });
    throw new DatabaseError(`Failed to fetch chat history: ${err.message}`, err);
  }
}

/**
 * Returns the total number of messages for a session.
 * Used to determine when to trigger memory summarization.
 * 
 * @param sessionId - The client session identifier
 * @returns Total message count
 */
export async function getMessageCount(sessionId: string): Promise<number> {
  try {
    const db = await getDatabase();
    const collection = db.collection<ChatHistoryMessage>(CHAT_HISTORY_COLLECTION);
    return await collection.countDocuments({ sessionId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to count messages', { sessionId, error: err.message });
    return 0;
  }
}
