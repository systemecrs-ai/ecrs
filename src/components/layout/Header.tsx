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
import ProfileDropdown from './ProfileDropdown';
import Image from 'next/image';
import Link from 'next/link';

interface HeaderProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export default function Header({ isChatOpen, onToggleChat }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="CartContext Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <h1 className="text-xl">
            <span className="font-semibold text-white tracking-tight">cart</span>
            <span className="font-light text-slate-300 tracking-tight">context</span>
          </h1>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          <ProfileDropdown />

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
