'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Clock, Loader2, PlusCircle } from 'lucide-react';

export interface ChatSession {
  sessionId: string;
  lastUpdated: string; // ISO date string
  preview: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  currentSessionId?: string;
}

export default function ChatSidebar({ isOpen, onClose, onSelectSession, onNewChat, currentSessionId }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat/history');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const grouped: Record<string, ChatSession[]> = {
      'Today': [],
      'Previous 7 Days': [],
      'Older': []
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.lastUpdated);
      if (sessionDate >= today) {
        grouped['Today'].push(session);
      } else if (sessionDate >= sevenDaysAgo) {
        grouped['Previous 7 Days'].push(session);
      } else {
        grouped['Older'].push(session);
      }
    });

    return grouped;
  };

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-transparent backdrop-blur-lg lg:hidden"
          />
          <motion.div
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-16 bottom-0 z-50 w-64  border-r border-white/10 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-t border-white/20 flex items-center justify-between bg-black border-white">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Chat History
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4">
              <button
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg transition-colors border border-indigo-500/20 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-thin">
              {isLoading ? (
                <div className="space-y-4 px-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-4 h-4 bg-white/10 rounded" />
                      <div className="flex-1 h-4 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-slate-500 text-sm pt-8">
                  No previous chats found.
                </div>
              ) : (
                Object.entries(groupedSessions).map(([group, groupSessions]) => {
                  if (groupSessions.length === 0) return null;
                  return (
                    <div key={group} className="space-y-1">
                      <h3 className="px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {group}
                      </h3>
                      {groupSessions.map((session) => (
                        <button
                          key={session.sessionId}
                          onClick={() => {
                            onSelectSession(session.sessionId);
                            onClose();
                          }}
                          className={`w-full flex items-start gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                            currentSessionId === session.sessionId
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {session.preview || 'New Conversation'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
