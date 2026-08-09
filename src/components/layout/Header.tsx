'use client';

/**
 * Header
 * 
 * Sleek, fixed top navigation bar with the CartContext brand,
 * user profile, cart panel toggle, and AI chat toggle for mobile.
 */

import { APP_NAME } from '@/config/constants';
import { Sparkles, X, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import ProfileDropdown from './ProfileDropdown';
import CartPanel from './CartPanel';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface HeaderProps {
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  /** Whether to show the mobile chat toggle button */
  showChatToggle?: boolean;
}

export default function Header({ isChatOpen, onToggleChat, showChatToggle = false }: HeaderProps) {
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  return (
    <>
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
            {/* Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center p-2 rounded-full text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
              id="cart-toggle-button"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white ring-2 ring-black">
                  {totalItems}
                </span>
              )}
            </button>

            <ProfileDropdown />

            {/* Chat Toggle Button — only visible on mobile or when showChatToggle is true */}
            {showChatToggle && onToggleChat && (
              <button
                onClick={onToggleChat}
                className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-white/[0.05] px-5 border border-white/[0.08] transition-all hover:bg-white/[0.1] active:scale-95 lg:hidden"
              >
                {isChatOpen ? (
                  <X className="h-4 w-4 text-white/70 transition-transform group-hover:rotate-90" />
                ) : (
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                )}
                <span className="text-sm font-medium text-white/90">
                  {isChatOpen ? 'Canvas' : 'Chat'}
                </span>
                
                {/* Subtle pulse effect when closed */}
                {!isChatOpen && (
                  <span className="absolute right-3 top-3 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Cart Panel */}
      <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
