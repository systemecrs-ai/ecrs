'use client';

/**
 * Header
 * 
 * Top navigation bar with the StyleAI brand and status indicator.
 */

import { APP_NAME } from '@/config/constants';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              {APP_NAME}
            </h1>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] -mt-0.5">
              AI Shopping Assistant
            </p>
          </div>
        </div>

        {/* Status / Info */}
        <div className="flex items-center gap-4">
          {/* RAG Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-white/40 font-medium">RAG Pipeline Active</span>
          </div>

          {/* Model Badge */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5">
            <svg className="h-3 w-3 text-indigo-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[11px] text-indigo-300/70 font-medium">Nemotron 550B</span>
          </div>
        </div>
      </div>
    </header>
  );
}
