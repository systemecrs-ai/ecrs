'use client';

/**
 * MessageBubble
 * 
 * Renders a single chat message with role-specific styling.
 * User messages appear on the right, assistant messages on the left.
 * Supports basic markdown rendering for assistant responses.
 */

import { useMemo } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  // Basic markdown-to-HTML for assistant messages
  const formattedContent = useMemo(() => {
    if (isUser) return content;
    return formatMarkdown(content);
  }, [content, isUser]);

  return (
    <div className={`flex items-start gap-3 px-4 py-2 animate-message-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-lg ${
        isUser
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20'
      }`}>
        {isUser ? (
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'rounded-br-md bg-gradient-to-br from-indigo-600/80 to-violet-600/80 text-white border border-indigo-500/20'
          : 'rounded-bl-md bg-white/[0.04] text-white/90 border border-white/[0.06]'
      }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose-chat text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Markdown Formatter ─────────────────────────────────────────────────────

/**
 * Lightweight markdown-to-HTML converter for chat messages.
 * Handles: bold, italic, code, headings, lists, links.
 */
function formatMarkdown(text: string): string {
  return text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings (### → h4, ## → h3)
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-indigo-300 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-indigo-200 mt-3 mb-1">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-white/80">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-cyan-300">$1</code>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-white/80 my-0.5">$1</li>')
    // Unordered lists
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc text-white/80 my-0.5">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
