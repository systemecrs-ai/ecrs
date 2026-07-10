'use client';

/**
 * TypingIndicator
 * 
 * Animated pulsing dots displayed when the AI is generating a response.
 */

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.04] px-5 py-3 border border-white/[0.06]">
        <span className="h-2 w-2 rounded-full bg-indigo-400/80 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-violet-400/80 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-cyan-400/80 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
