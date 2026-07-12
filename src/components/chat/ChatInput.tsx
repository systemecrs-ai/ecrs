'use client';

/**
 * ChatInput
 * 
 * Premium chat input with glassmorphism styling,
 * auto-resizing textarea, and send button.
 */

import { useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

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
    <div className="border-t border-white/[0.06] bg-black/40 p-4 backdrop-blur-2xl">
      <form onSubmit={onSubmit} className="relative mx-auto w-full max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 shadow-sm transition-all duration-300 focus-within:border-indigo-500/40 focus-within:bg-white/[0.04] focus-within:shadow-lg focus-within:shadow-indigo-500/5">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent py-1 text-sm text-white placeholder-white/30 focus:outline-none disabled:opacity-50 leading-relaxed max-h-[160px]"
            id="chat-input"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100"
            id="chat-send-button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
          </button>
        </div>

        {/* Helper text */}
        <p className="mt-2.5 text-center text-[10px] text-white/30">
          Press <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">Enter</kbd> to send · <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">Shift + Enter</kbd> for new line
        </p>
      </form>
    </div>
  );
}
