'use client';

/**
 * MessageBubble
 * 
 * Renders a single chat message with role-specific styling.
 * User messages appear on the right, assistant messages on the left.
 * Supports basic markdown rendering for assistant responses.
 */

import { useMemo } from 'react';
import { User } from 'lucide-react';
import Image from 'next/image';

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
    <div className={`flex w-full items-start gap-4 px-4 py-6 animate-message-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-lg ${
        isUser
          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20'
          : 'bg-white/[0.05] border border-white/[0.1]'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Image
            src="/logo.jpg"
            alt="AI Avatar"
            width={16}
            height={16}
            className="object-contain"
          />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 overflow-hidden ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[85%] rounded-2xl px-5 py-3.5 text-left ${
          isUser
            ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600/90 to-violet-600/90 text-white shadow-xl shadow-indigo-500/10 border border-indigo-500/20'
            : 'rounded-tl-sm bg-white/[0.02] text-white/90 border border-white/[0.06] backdrop-blur-md'
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
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-indigo-300 mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-indigo-200 mt-4 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-white/70">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-indigo-300 border border-white/[0.05]">$1</code>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-5 list-decimal text-white/80 my-1 pl-1 marker:text-white/40">$1</li>')
    // Unordered lists
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-5 list-disc text-white/80 my-1 pl-1 marker:text-white/40">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
