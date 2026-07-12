'use client';

/**
 * ChatInterface
 * 
 * Main chat container that orchestrates the full conversation UI.
 * Uses Vercel AI SDK v7's useChat() hook for streaming communication
 * with the /api/chat endpoint.
 * 
 * Now optimized for a side-drawer layout with a compact empty state.
 */

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import RetrievalIndicator from '@/components/ui/RetrievalIndicator';
import { APP_NAME, SUGGESTED_QUERIES } from '@/config/constants';
import { Sparkles, MessageSquarePlus } from 'lucide-react';
import { useSmoothStream } from './useSmoothStream';

/**
 * Generates or retrieves a persistent session ID from localStorage.
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  const key = 'ecrs-session-id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Extracts text content from a UIMessage's parts array.
 */
function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

export default function ChatInterface() {
  const [sessionId] = useState(() => getSessionId());

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId,
  });

  const [inputValue, setInputValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const isLoading = status === 'submitted' || status === 'streaming';
  const isStreaming = status === 'streaming';
  const isSubmitted = status === 'submitted';
  
  const smoothedMessages = useSmoothStream(messages, isStreaming);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isLoading) return;
      sendMessage({ text: trimmed }, { body: { sessionId } });
      setInputValue('');
    },
    [inputValue, isLoading, sendMessage, sessionId]
  );

  // Handle suggestion chip click
  const handleSuggestionClick = useCallback(
    (query: string) => {
      if (isLoading) return;
      sendMessage({ text: query }, { body: { sessionId } });
    },
    [isLoading, sendMessage, sessionId]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const hasMessages = smoothedMessages.length > 0;

  return (
    <div className="flex h-full flex-col bg-black/40">
      {/* Drawer Header (Internal) */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/20 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
        </div>
        {hasMessages && (
          <button
            onClick={handleClearChat}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white"
            title="New Chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {!hasMessages ? (
          /* ── Compact Empty State for Drawer ─────────────────────── */
          <div className="flex h-full flex-col items-center justify-center px-6 py-8">
            <div className="relative mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10">
                <Sparkles className="h-8 w-8 text-indigo-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{APP_NAME}</h2>
            <p className="text-xs text-white/40 mb-8 text-center leading-relaxed">
              Your personal AI stylist. Ask for outfit recommendations, finding specific items, or styling advice.
            </p>

            {/* Suggestion Chips */}
            <div className="flex w-full flex-col gap-2">
              {SUGGESTED_QUERIES.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(query)}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-[13px] text-white/60 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.04] hover:text-white/90"
                >
                  <MessageSquarePlus className="h-4 w-4 text-indigo-400/70 group-hover:text-indigo-400 transition-colors" />
                  <span className="truncate">{query}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Messages List ──────────────────────────────────────── */
          <div className="flex flex-col py-6">
            {smoothedMessages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={getMessageText(message)}
              />
            ))}

            {/* Retrieval indicator — shows during query processing */}
            <div className="px-4">
              <RetrievalIndicator isActive={isSubmitted} />
            </div>

            {/* Typing indicator while streaming */}
            <div className="px-4">
              {isLoading && !isSubmitted && <TypingIndicator />}
            </div>

            {/* Error display */}
            {error && (
              <div className="mx-4 my-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300/80">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 text-red-300/60">{error.message || 'Failed to get a response. Please try again.'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
