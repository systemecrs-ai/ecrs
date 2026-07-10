'use client';

/**
 * ChatInput
 * 
 * Premium chat input with glassmorphism styling,
 * auto-resizing textarea, and send button.
 */

import { useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Ask StyleAI about apparel...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        const form = textareaRef.current?.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <div className="border-t border-white/[0.06] bg-black/20 backdrop-blur-xl p-4">
      <form onSubmit={onSubmit} className="relative mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-all duration-300 focus-within:border-indigo-500/40 focus-within:bg-white/[0.05] focus-within:shadow-lg focus-within:shadow-indigo-500/5">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/25 focus:outline-none disabled:opacity-40 leading-relaxed max-h-[160px]"
            id="chat-input"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-30 disabled:hover:shadow-none disabled:active:scale-100"
            id="chat-send-button"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 70" />
              </svg>
            ) : (
              <svg className="h-4 w-4 transition-transform group-hover:translate-y-[-1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </div>

        {/* Helper text */}
        <p className="mt-2 text-center text-[11px] text-white/20">
          Press <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-mono">Enter</kbd> to send · <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-mono">Shift + Enter</kbd> for new line
        </p>
      </form>
    </div>
  );
}
