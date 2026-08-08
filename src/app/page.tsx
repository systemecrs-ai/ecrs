'use client';

/**
 * Main Application Page — Split-Pane Workspace Layout
 * 
 * Desktop: Left pane (60-65%) = Product Canvas, Right pane (35-40%) = Chat
 * Mobile: Bottom tab bar switching between Canvas and Chat full-screen views
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GradientBackground from '@/components/ui/GradientBackground';
import Header from '@/components/layout/Header';
import ChatInterface from '@/components/chat/ChatInterface';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ProductCanvas from '@/components/ui/ProductCanvas';
import { CanvasProvider, useCanvas } from '@/context/CanvasContext';
import { Analytics } from "@vercel/analytics/next";
import { Sparkles, Layers } from 'lucide-react';

function getLocalThreadId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'ecrs-thread-id';
  let threadId = localStorage.getItem(key);
  if (!threadId) {
    threadId = crypto.randomUUID();
    localStorage.setItem(key, threadId);
  }
  return threadId;
}

/**
 * Loading Skeleton Overlay for the Canvas
 */
function CanvasLoadingOverlay() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/80 p-8 shadow-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="animate-pulse text-sm font-medium text-white/80">
          Curating catalog recommendations...
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Mobile tab type for bottom tab bar
 */
type MobileTab = 'canvas' | 'chat';

function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  
  const { activeView, viewData, setCanvasView, isLoading: isCanvasLoading } = useCanvas();

  useEffect(() => {
    setCurrentThreadId(getLocalThreadId());
  }, []);

  const handleSelectThread = async (threadId: string) => {
    setCurrentThreadId(threadId);
    localStorage.setItem('ecrs-thread-id', threadId);
    
    // Reset Canvas to default view when switching threads
    setCanvasView('DEFAULT_CANVAS', []);

    try {
      const res = await fetch(`/api/chat/history/${threadId}`);
      const data = await res.json();
      if (data.messages) {
        setInitialMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch thread messages', error);
    }
  };

  const handleNewChat = () => {
    const newThreadId = crypto.randomUUID();
    setCurrentThreadId(newThreadId);
    localStorage.setItem('ecrs-thread-id', newThreadId);
    setInitialMessages([]);
    setCanvasView('DEFAULT_CANVAS', []);
  };

  const handleToggleMobileTab = () => {
    setMobileTab(prev => prev === 'canvas' ? 'chat' : 'canvas');
  };

  return (
    <>
      <Analytics />
      <GradientBackground />
      <div className="flex h-screen w-full overflow-hidden flex-col">
        <Header 
          isChatOpen={mobileTab === 'chat'}
          onToggleChat={handleToggleMobileTab}
          showChatToggle={true}
        />
        
        <main className="relative flex flex-1 overflow-hidden">
          {/* Chat Sidebar (Left History Panel — Overlay) */}
          <ChatSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
            currentThreadId={currentThreadId}
          />

          {/* ══════════════════════════════════════════════════════════
              SPLIT-PANE LAYOUT
              Desktop: side-by-side (left canvas 60-65%, right chat 35-40%)
              Mobile: one pane at a time with bottom tab bar
              ══════════════════════════════════════════════════════════ */}

          {/* LEFT PANE — Product Canvas (hidden on mobile when chat tab is active) */}
          <div
            className={`relative flex-1 transition-all duration-300 ease-in-out ${
              mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
            } flex-col overflow-y-auto`}
          >
            {/* Canvas Loading Overlay */}
            <AnimatePresence>
              {isCanvasLoading && <CanvasLoadingOverlay />}
            </AnimatePresence>

            <ProductCanvas />
          </div>

          {/* RIGHT PANE — Chat Interface */}
          <div
            className={`flex flex-col border-l border-white/[0.08] bg-black/60 backdrop-blur-2xl transition-all duration-300 ease-in-out ${
              mobileTab === 'canvas' ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-[450px] flex-shrink-0 overflow-y-auto`}
          >
            {currentThreadId && (
              <ChatInterface 
                key={currentThreadId} 
                threadId={currentThreadId} 
                initialMessages={initialMessages} 
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onNewChat={handleNewChat}
              />
            )}
          </div>
        </main>

        {/* ── Mobile Bottom Tab Bar ─────────────────────────────── */}
        <div className="sticky bottom-0 z-40 flex items-center border-t border-white/[0.08] bg-black/80 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMobileTab('canvas')}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
              mobileTab === 'canvas'
                ? 'text-indigo-400'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Products</span>
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
              mobileTab === 'chat'
                ? 'text-indigo-400'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">AI Chat</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <CanvasProvider>
      <MainApp />
    </CanvasProvider>
  );
}