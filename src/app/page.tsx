'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GradientBackground from '@/components/ui/GradientBackground';
import Header from '@/components/layout/Header';
import ChatInterface from '@/components/chat/ChatInterface';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ProductCanvas from '@/components/ui/ProductCanvas';
import ProductResultsCanvas from '@/components/canvas/ProductResultsCanvas';
import { CanvasProvider, useCanvas } from '@/context/CanvasContext';
import { Analytics } from "@vercel/analytics/next";

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

function MainApp() {
  const [isChatOpen, setIsChatOpen] = useState(true); // Default to open for better UX
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  
  // 1. EXTRACT ALL CANVAS CONTEXT VALUES
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

  return (
    <>
      <Analytics />
      <GradientBackground />
      <div className="flex min-h-screen flex-col">
        <Header isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} />
        
        <main className="relative flex flex-1 overflow-hidden">
          {/* Chat Sidebar (Left) */}
          <ChatSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
            currentThreadId={currentThreadId}
          />

          {/* Main Product Canvas (Middle/Center) */}
          <div
            className={`relative flex-1 transition-all duration-500 ease-in-out ${
              isChatOpen ? 'mr-0 lg:mr-[400px]' : ''
            } ${isSidebarOpen ? 'ml-0 lg:ml-64' : ''}`}
          >
            {/* 2. ENTERPRISE LOADING OVERLAY: Rendered reactively when tool is running */}
            <AnimatePresence>
              {isCanvasLoading && <CanvasLoadingOverlay />}
            </AnimatePresence>

            {activeView === 'PRODUCT_RESULTS' ? (
              <ProductResultsCanvas 
                products={viewData} 
                onBack={() => setCanvasView('DEFAULT_CANVAS')} 
              />
            ) : (
              <ProductCanvas />
            )}
          </div>

          {/* 3. ALWAYS-MOUNTED CHAT DRAWER: Uses CSS translation instead of conditional unmounting */}
          <div
            className={`fixed right-0 top-16 z-40 h-[calc(100vh-64px)] w-full max-w-[400px] border-l border-white/[0.08] bg-black/60 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-in-out sm:w-[400px] ${
              isChatOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
            }`}
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