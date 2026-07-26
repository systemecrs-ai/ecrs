import { NextResponse } from 'next/server';
import { getRecentMessages } from '@/infrastructure/database/chat-history-repository';
import { createClient } from '@/utils/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatSessionHistoryAPI');

/**
 * GET /api/chat/history/[id]
 * Fetches the recent messages for a specific thread, scoped to the
 * authenticated user. The [id] parameter is the threadId.
 * Requires Supabase authentication — returns 401 if unauthorized.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate via Supabase server-side
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const threadId = (await params).id;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    // Fetch messages filtered by BOTH userId and threadId
    const messages = await getRecentMessages(user.id, threadId, 50);
    
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

