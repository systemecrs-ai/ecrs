import { NextResponse } from 'next/server';
import { getSessions } from '@/infrastructure/database/chat-history-repository';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatHistoryAPI');

/**
 * GET /api/chat/history
 * Fetches the list of all chat sessions, grouped by sessionId.
 */
export async function GET(req: Request) {
  try {
    const sessions = await getSessions();
    
    return NextResponse.json({ sessions });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch chat sessions', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}
