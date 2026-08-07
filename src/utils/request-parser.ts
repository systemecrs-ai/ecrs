import { ValidationError, AppError } from '@/lib/errors';

export async function parseChatRequest(req: Request) {
  const body = await req.json();

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError('Request must include a non-empty "messages" array.');
  }

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    throw new AppError('Unauthorized access to chat API.', 'UNAUTHORIZED', 401);
  }

  const threadId = typeof body.threadId === 'string' && body.threadId.trim() ? body.threadId.trim() : 'default';
  const canvasState = typeof body.canvasState === 'string' ? body.canvasState : null;

  const messages = body.messages;
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== 'user') {
    throw new ValidationError('Last message must be a user message.');
  }

  // Extract user query
  let userQuery = '';
  if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
    userQuery = lastMessage.parts
      .filter((p: any) => p.type === 'text' && p.text)
      .map((p: any) => p.text).join('');
  } else if (lastMessage.content) {
    userQuery = lastMessage.content;
  }
  userQuery = userQuery.trim();
  if (!userQuery) throw new ValidationError('User message must contain non-empty text.');

  // Build full history
  const chatHistory = messages.slice(0, -1).map((msg: any) => {
    let content = '';
    if (msg.parts && Array.isArray(msg.parts)) {
      content = msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
    } else if (msg.content) {
      content = msg.content;
    }
    return { role: msg.role, content };
  });

  // Build short formatted history for intent router
  const recentHistory = chatHistory.slice(-3);
  const formattedHistory = recentHistory.length > 0
    ? recentHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
    : 'None';

  return { userId, threadId, userQuery, chatHistory, formattedHistory, canvasState };
}