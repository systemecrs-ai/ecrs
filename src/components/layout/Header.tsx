'use client';

/**
 * Header
 * 
 * Sleek, fixed top navigation bar with the StyleAI brand, user profile,
 * and a toggle for the AI Assistant.
 */

import { APP_NAME } from '@/config/constants';
import { Sparkles, Menu, X, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export default function Header({ isChatOpen, onToggleChat }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">
              {APP_NAME}
            </h1>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* User Profile Avatar */}
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.1]">
            <User className="h-4 w-4 text-white/70" />
          </div>

          {/* Chat Toggle Button */}
          <button
            onClick={onToggleChat}
            className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-white/[0.05] px-5 border border-white/[0.08] transition-all hover:bg-white/[0.1] active:scale-95"
          >
            {isChatOpen ? (
              <X className="h-4 w-4 text-white/70 transition-transform group-hover:rotate-90" />
            ) : (
              <Sparkles className="h-4 w-4 text-indigo-400" />
            )}
            <span className="text-sm font-medium text-white/90">
              {isChatOpen ? 'Close AI' : 'Ask AI'}
            </span>
            
            {/* Subtle pulse effect when closed */}
            {!isChatOpen && (
              <span className="absolute right-3 top-3 flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
