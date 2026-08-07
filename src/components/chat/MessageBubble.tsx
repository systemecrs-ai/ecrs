'use client';

/**
 * MessageBubble
 * 
 * Renders a single chat message with role-specific styling.
 * User messages appear on the right, assistant messages on the left.
 * Supports basic markdown rendering for assistant responses.
 */

import { useMemo } from 'react';
import { User, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: any[];
  /** True when any tool invocation is in partial-call or call state */
  isPendingTool?: boolean;
  onConfirmAction?: (payload: any) => void;
  onCancelAction?: (payload: any) => void;
}

export default function MessageBubble({ role, content, toolInvocations, isPendingTool = false, onConfirmAction, onCancelAction }: MessageBubbleProps) {
  const isUser = role === 'user';

  // Genuinely empty: no text content AND no tool invocations → render nothing
  if (!content && (!toolInvocations || toolInvocations.length === 0)) {
    return null;
  }

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
            <div className="flex flex-col gap-3">
              {content && (
                <div className="flex items-start gap-2">
                  {/* Tool-Intent Pulsing Indicator */}
                  {isPendingTool && (
                    <div className="mt-1.5 flex shrink-0 items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-indigo-400 animate-tool-pulse" />
                    </div>
                  )}
                  <div
                    className={`prose-chat text-sm leading-relaxed flex-1 ${
                      isPendingTool ? 'text-white/70' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                  />
                </div>
              )}

              {/* Shimmer bar for active tool streaming */}
              {isPendingTool && (
                <div className="h-1 w-full rounded-full overflow-hidden bg-white/[0.04]">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500/60 via-violet-500/60 to-indigo-500/60 animate-shimmer" />
                </div>
              )}

              {/* Tool Invocations Rendering */}
              {toolInvocations?.map(tool => {
                // Loading State
                if (tool.state !== 'result') {
                  let loadingText = `Running ${tool.toolName}...`;
                  if (tool.toolName === 'checkInventory') loadingText = 'Checking store inventory...';
                  if (tool.toolName === 'fetchOrderStatus') loadingText = 'Fetching order status...';
                  if (tool.toolName === 'reserveItemInStore') loadingText = 'Preparing reservation...';
                  if (tool.toolName === 'addToCart') loadingText = 'Adding to cart...';

                  return (
                    <div key={tool.toolCallId} className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 w-fit">
                      <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      {loadingText}
                    </div>
                  );
                }

                // Result State (HITL Confirmation Card)
                const result = tool.result;
                if (result?.hitlRequired && tool.toolName === 'reserveItemInStore') {
                  return (
                    <div key={tool.toolCallId} className="mt-2 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                      <h4 className="text-sm font-semibold text-indigo-300 mb-1">Confirmation Required</h4>
                      <p className="text-xs text-indigo-200/70 mb-4">{result.data?.actionSummary || 'Approve this action to proceed.'}</p>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => onConfirmAction?.(result.data)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onCancelAction?.(result.data)}
                          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                if (tool.toolName === 'addToCart' && tool.state === 'result') {
                  return (
                    <div key={tool.toolCallId} className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 w-fit">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Added to Cart - [View Cart]
                    </div>
                  );
                }

                return null;
              })}
            </div>
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
