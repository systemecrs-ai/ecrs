'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GradientBackground from '@/components/ui/GradientBackground';
import Header from '@/components/layout/Header';
import ChatInterface from '@/components/chat/ChatInterface';
import ProductCanvas from '@/components/ui/ProductCanvas';
import { Analytics } from "@vercel/analytics/next"

/**
 * Home Page
 *
 * Main application page rendering the Split View layout:
 * Product Canvas (Main) and collapsible AI Chat Drawer.
 */
export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Analytics />
      <GradientBackground />
      <div className="flex min-h-screen flex-col">
        <Header isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} />
        
        <main className="relative flex flex-1">
          {/* Main Product Canvas */}
          <div
            className={`flex-1 transition-all duration-500 ease-in-out ${
              isChatOpen ? 'mr-0 lg:mr-[400px]' : ''
            }`}
          >
            <ProductCanvas />
          </div>

          {/* Collapsible Chat Drawer */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-16 z-40 h-[calc(100vh-64px)] w-full max-w-[400px] border-l border-white/[0.08] bg-black/60 shadow-2xl backdrop-blur-2xl sm:w-[400px]"
              >
                <ChatInterface />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
