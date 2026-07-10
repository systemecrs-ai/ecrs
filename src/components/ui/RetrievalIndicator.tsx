'use client';

/**
 * RetrievalIndicator
 * 
 * Animated pill-shaped indicator displaying RAG pipeline retrieval stages.
 * Shows subtle "Searching catalog...", "Scanning documents...", 
 * "Retrieving memory..." states to build trust with the user.
 */

import { useEffect, useState } from 'react';

export type RetrievalStage =
  | 'searching'    // Searching product catalog
  | 'scanning'     // Scanning uploaded documents
  | 'remembering'  // Retrieving user preferences
  | 'generating'   // Generating response
  | null;

interface RetrievalIndicatorProps {
  isActive: boolean;
}

const STAGE_SEQUENCE: { stage: RetrievalStage; label: string; icon: string; duration: number }[] = [
  { stage: 'searching', label: 'Searching product catalog', icon: '🔍', duration: 800 },
  { stage: 'scanning', label: 'Scanning documents', icon: '📄', duration: 600 },
  { stage: 'remembering', label: 'Retrieving your preferences', icon: '🧠', duration: 500 },
  { stage: 'generating', label: 'Composing response', icon: '✨', duration: 0 },
];

export default function RetrievalIndicator({ isActive }: RetrievalIndicatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      setCurrentIndex(0);
      return;
    }

    setVisible(true);
    setCurrentIndex(0);

    // Cycle through stages with timed transitions
    let index = 0;
    const timers: NodeJS.Timeout[] = [];

    const advanceStage = () => {
      if (index < STAGE_SEQUENCE.length - 1) {
        index++;
        setCurrentIndex(index);
        const nextDuration = STAGE_SEQUENCE[index]?.duration;
        if (nextDuration > 0) {
          timers.push(setTimeout(advanceStage, nextDuration));
        }
      }
    };

    const firstDuration = STAGE_SEQUENCE[0]?.duration;
    if (firstDuration > 0) {
      timers.push(setTimeout(advanceStage, firstDuration));
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive]);

  if (!visible || !isActive) return null;

  const current = STAGE_SEQUENCE[currentIndex];
  if (!current) return null;

  return (
    <div className="flex items-center justify-center px-4 py-2 animate-fade-in">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1.5 backdrop-blur-sm">
        {/* Animated dots */}
        <div className="flex items-center gap-0.5">
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>

        {/* Icon */}
        <span className="text-xs" role="img" aria-label={current.label}>
          {current.icon}
        </span>

        {/* Label */}
        <span className="text-xs text-white/50 font-medium transition-all duration-300">
          {current.label}...
        </span>
      </div>
    </div>
  );
}
