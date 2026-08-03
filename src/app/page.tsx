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
import { Analytics } from "@vercel/analytics/next"

/**
 * Generates or retrieves a persistent thread ID from localStorage.
 */
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
 * Main Application View
 */
function MainApp() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const { activeView, viewData, setCanvasView } = useCanvas();

  useEffect(() => {
    setCurrentThreadId(getLocalThreadId());
  }, []);

  const handleSelectThread = async (threadId: string) => {
    setCurrentThreadId(threadId);
    localStorage.setItem('ecrs-thread-id', threadId);
    
    // Fetch initial messages for this thread
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

          {/* Main Product Canvas */}
          <div
            className={`flex-1 transition-all duration-500 ease-in-out ${
              isChatOpen ? 'mr-0 lg:mr-[400px]' : ''
            } ${isSidebarOpen ? 'ml-0 lg:ml-64' : ''}`}
          >
            {activeView === 'PRODUCT_RESULTS' ? (
              <ProductResultsCanvas products={viewData} onBack={() => setCanvasView('DEFAULT_CANVAS')} />
            ) : (
              <ProductCanvas />
            )}
          </div>

          {/* Collapsible Chat Drawer (Right) */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-16 z-40 h-[calc(100vh-64px)] w-full max-w-[400px] border-l border-white/[0.08] bg-black/60 shadow-2xl backdrop-blur-2xl sm:w-[400px]"
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
              </motion.div>
            )}
          </AnimatePresence>
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
