'use client';

/**
 * ChatInterface
 * 
 * Main chat container that orchestrates the full conversation UI.
 * Uses Vercel AI SDK v7's useChat() hook for streaming communication
 * with the /api/chat endpoint.
 * 
 * Now includes:
 * - Session-based identity for long-term memory
 * - Retrieval state indicators during RAG pipeline
 * - Enhanced error display
 */

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import RetrievalIndicator from '@/components/ui/RetrievalIndicator';
import { APP_NAME, APP_TAGLINE, SUGGESTED_QUERIES } from '@/config/constants';

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

  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
  });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isLoading = status === 'submitted' || status === 'streaming';
  const isSubmitted = status === 'submitted';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!hasMessages ? (
          /* ── Empty State ─────────────────────────────────────────── */
          <div className="flex h-full flex-col items-center justify-center px-6 py-12">
            {/* Logo / Icon */}
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 border-2 border-[#0c0c1d] animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{APP_NAME}</h2>
            <p className="text-sm text-white/40 mb-8 text-center max-w-md">{APP_TAGLINE}. Powered by RAG-enhanced AI with long-term memory to remember your preferences.</p>

            {/* Memory badge */}
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/30 font-medium">Memory Active</span>
            </div>

            {/* Suggestion Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
              {SUGGESTED_QUERIES.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(query)}
                  className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/60 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.06] hover:text-white/90 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-[0.98]"
                  id={`suggestion-chip-${index}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400/80 group-hover:bg-indigo-500/20 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </span>
                  <span className="truncate">{query}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Messages List ──────────────────────────────────────── */
          <div className="mx-auto max-w-3xl py-6 space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={getMessageText(message)}
              />
            ))}

            {/* Retrieval indicator — shows during query processing */}
            <RetrievalIndicator isActive={isSubmitted} />

            {/* Typing indicator while streaming */}
            {isLoading && !isSubmitted && <TypingIndicator />}

            {/* Error display */}
            {error && (
              <div className="mx-4 my-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300/80">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 text-red-300/60">{error.message || 'Failed to get a response. Please try again.'}</p>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
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
