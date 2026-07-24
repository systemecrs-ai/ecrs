import { NextResponse } from 'next/server';
import { getRecentMessages } from '@/infrastructure/database/chat-history-repository';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatSessionHistoryAPI');

/**
 * GET /api/chat/history/[id]
 * Fetches the recent messages for a specific session ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = (await params).id;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Pass a higher limit to ensure we load a good chunk of history
    const messages = await getRecentMessages(sessionId, 50);
    
    // Map to the shape expected by Vercel AI SDK initialMessages
    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      createdAt: msg.timestamp
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch session messages', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to fetch session messages' },
      { status: 500 }
    );
  }
}
