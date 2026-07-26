import { NextResponse } from 'next/server';
import { getThreads } from '@/infrastructure/database/chat-history-repository';
import { createClient } from '@/utils/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatHistoryAPI');

/**
 * GET /api/chat/history
 * Fetches the list of all chat threads for the authenticated user.
 * Requires Supabase authentication — returns 401 if unauthorized.
 */
export async function GET(req: Request) {
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

    const threads = await getThreads(user.id);
    
    return NextResponse.json({ threads });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch chat threads', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to fetch chat threads' },
      { status: 500 }
    );
  }
}
