'use client';

/**
 * ChatInterface
 * 
 * Main chat container that orchestrates the full conversation UI.
 * Uses Vercel AI SDK v7's useChat() hook for streaming communication
 * with the /api/chat endpoint.
 * 
 * Now optimized for a side-drawer layout with a compact empty state
 * and supports session continuation via initialMessages prop.
 */

import { useChat } from '@ai-sdk/react';
import { useCanvas, type CanvasProduct } from '@/context/CanvasContext';
import { useCart } from '@/context/CartContext';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useCallback, type FormEvent, useMemo } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import RetrievalIndicator from '@/components/ui/RetrievalIndicator';
import { SUGGESTED_QUERIES } from '@/config/constants';
import { MessageSquarePlus, History } from 'lucide-react';
import Image from 'next/image';

interface ChatInterfaceProps {
  threadId: string;
  initialMessages?: any[];
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
}

function getMessageText(message: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (message.content) return message.content;
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function parseCanvasToolResult(result: unknown): CanvasProduct[] | null {
  if (typeof result !== 'object' || result === null) return null;
  const r = result as Record<string, unknown>;
  if (!r.success || !r.data) return null;
  const data = r.data as Record<string, unknown>;
  if (!Array.isArray(data.items)) return null;
  return data.items as CanvasProduct[];
}

export default function ChatInterface({ threadId, initialMessages = [], onToggleSidebar, onNewChat }: ChatInterfaceProps) {
  // 1. PULL IN THE LOADING SETTER
  const { setCanvasView, getCanvasSummary, setCanvasLoading, viewData, setSearchResults } = useCanvas();
  const { addItem } = useCart();
  
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: threadId,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const processedToolCallIds = useRef<Set<string>>(new Set());

  // ─── TOOL INTERCEPTION & LOADING CONTROLLER ────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    // 🛠️ UNIVERSAL ADAPTER (Same as above)
    const activeTools: any[] = [];
    if ((lastMessage as any).toolInvocations) activeTools.push(...(lastMessage as any).toolInvocations);
    
    if ((lastMessage as any).parts) {
      for (const p of (lastMessage as any).parts) {
        if (p.type === 'tool-invocation' && p.toolInvocation) {
          activeTools.push(p.toolInvocation);
        } else if (p.toolCallId && p.type && p.type.startsWith('tool-')) {
          activeTools.push({
            toolCallId: p.toolCallId,
            toolName: p.toolName || p.type.replace('tool-', ''),
            state: p.state || (p.output ? 'result' : 'input-streaming'),
            args: p.input || p.args || {},
            result: p.output || p.result
          });
        }
      }
    }

    for (const inv of activeTools) {
      if (!inv) continue;

      if (inv.toolName === 'updateProductCanvas') {
        // Check for your specific 'input-streaming' state!
        if (inv.state === 'call' || inv.state === 'partial-call' || inv.state === 'input-streaming') {
          setCanvasLoading(true);
        } 
        else if (inv.state === 'result' || inv.result) {
          setCanvasLoading(false);
          if (!processedToolCallIds.current.has(inv.toolCallId)) {
            const items = parseCanvasToolResult(inv.result);
            if (items) {
              processedToolCallIds.current.add(inv.toolCallId);
              setSearchResults(items);
            }
          }
        }
      } else if (inv.toolName === 'addToCart') {
        if (inv.state === 'result' || inv.result) {
          if (!processedToolCallIds.current.has(inv.toolCallId)) {
            processedToolCallIds.current.add(inv.toolCallId);
            if (inv.result?.data) {
              // Enrich with product metadata from canvas if available
              const canvasProduct = viewData.find(p => p.sku === inv.result.data.sku);
              addItem({
                sku: inv.result.data.sku,
                quantity: inv.result.data.quantity ?? 1,
                size: inv.result.data.size,
                variant: inv.result.data.variant,
                name: canvasProduct?.name,
                price: canvasProduct?.price,
                imageUrl: canvasProduct?.imageUrl,
              });
            }
          }
        }
      }
    }
  }, [messages, setCanvasView, setCanvasLoading, addItem, viewData, setSearchResults]);

  // ─── VISUAL CLEANUP & DISPLAY STATE PRE-PROCESSING ─────────────────────
  // ─── VISUAL CLEANUP & DISPLAY STATE PRE-PROCESSING ─────────────────────
  const cleanedMessages = useMemo(() => {
    return messages
      .map(msg => {
        if (msg.role === 'assistant') {
          let cleanContent = getMessageText(msg).replace(
            /<tool_call>[\s\S]*?<\/tool_call>|\{[\s\S]*?"name":\s*"updateProductCanvas"[\s\S]*?\}/g,
            ''
          );

          // 🛠️ UNIVERSAL ADAPTER: Catch EVERY version of Vercel AI SDK tool shapes
          const activeTools: any[] = [];
          
          if ((msg as any).toolInvocations) activeTools.push(...(msg as any).toolInvocations);
          
          if ((msg as any).parts) {
            for (const p of (msg as any).parts) {
              // Standard format
              if (p.type === 'tool-invocation' && p.toolInvocation) {
                activeTools.push(p.toolInvocation);
              } 
              // YOUR EXACT LOG FORMAT
              else if (p.toolCallId && p.type && p.type.startsWith('tool-')) {
                activeTools.push({
                  toolCallId: p.toolCallId,
                  toolName: p.toolName || p.type.replace('tool-', ''), // Extracts 'updateProductCanvas'
                  state: p.state || (p.output ? 'result' : 'input-streaming'), // Maps your state
                  args: p.input || p.args || {}, // Maps 'input' -> 'args'
                  result: p.output || p.result // Maps 'output' -> 'result'
                });
              }
            }
          }

          const canvasTool = activeTools.find((t: any) => t && t.toolName === 'updateProductCanvas');
          const cartTool = activeTools.find((t: any) => t && t.toolName === 'addToCart');
          
          // Updated to check your specific 'input-streaming' state
          const isPendingTool = activeTools.some((t: any) => t && (t.state === 'partial-call' || t.state === 'call' || t.state === 'input-streaming'));

          // THE EMPTY BUBBLE FIX
          if (!cleanContent.trim()) {
            if (canvasTool) {
              if (canvasTool.state === 'partial-call' || canvasTool.state === 'call' || canvasTool.state === 'input-streaming') {
                cleanContent = canvasTool.args?.summary || 'Curating recommendations...';
              } else if (canvasTool.state === 'result' || canvasTool.result) {
                cleanContent = canvasTool.args?.summary || canvasTool.result?.data?.summary || 'Here are your recommendations!';
              }
            } else if (cartTool) {
              if (cartTool.state === 'partial-call' || cartTool.state === 'call' || cartTool.state === 'input-streaming') {
                cleanContent = 'Adding item to cart...';
              } else if (cartTool.state === 'result' || cartTool.result) {
                cleanContent = cartTool.result?.data?.message || 'Successfully added to your cart!';
              }
            }
          }

          const finalContent = cleanContent.trim();

          if (!finalContent && activeTools.length === 0) {
            return null; 
          }

          return { 
            ...msg, 
            content: finalContent, 
            _isPendingTool: isPendingTool,
            _safeTools: activeTools 
          };
        }
        return msg;
      })
      .filter(Boolean);
  }, [messages]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) setMessages(initialMessages);
    else setMessages([]);
  }, [threadId, initialMessages, setMessages]);

  const [inputValue, setInputValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';
  const isSubmitted = status === 'submitted';

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isLoading) return;
      sendMessage({ text: trimmed }, { body: { threadId, canvasState: getCanvasSummary() } });
      setInputValue('');
    },
    [inputValue, isLoading, sendMessage, threadId, getCanvasSummary]
  );

  const handleSuggestionClick = useCallback(
    (query: string) => {
      if (isLoading) return;
      sendMessage({ text: query }, { body: { threadId, canvasState: getCanvasSummary() } });
    },
    [isLoading, sendMessage, threadId, getCanvasSummary]
  );

  const handleClearChat = useCallback(() => {
    if (onNewChat) onNewChat();
    else setMessages([]);
  }, [onNewChat, setMessages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col bg-black/40">
      {/* Drawer Header (Internal) */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/20 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="mr-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              title="Toggle History Sidebar"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <Image
            src="/logo.jpg"
            alt="CartContext Logo"
            width={16}
            height={16}
            className="object-contain"
          />
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
        </div>
        <button
          onClick={handleClearChat}
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white"
          title="New Chat"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {!hasMessages ? (
          /* ── Compact Empty State for Drawer ─────────────────────── */
          <div className="flex h-full flex-col items-center justify-center px-6 py-8">
            <div className="relative mb-6">
              <Image
                src="/logo.jpg"
                alt="CartContext Logo"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>

            <h2 className="text-xl mb-2">
              <span className="font-semibold text-white tracking-tight">cart</span>
              <span className="font-light text-slate-300 tracking-tight">context</span>
            </h2>
            <p className="text-xs text-white/40 mb-8 text-center leading-relaxed">
              Your personal AI stylist. Ask for outfit recommendations, finding specific items, or styling advice.
            </p>

            {/* Suggestion Chips */}
            <div className="flex w-full flex-col gap-2">
              {SUGGESTED_QUERIES.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(query)}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-[13px] text-white/60 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.04] hover:text-white/90"
                >
                  <MessageSquarePlus className="h-4 w-4 text-indigo-400/70 group-hover:text-indigo-400 transition-colors" />
                  <span className="truncate">{query}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col py-6">
            {/* MAP OVER cleanedMessages INSTEAD OF messages */}
            {cleanedMessages.map((message: any) => {
              const toolInvocations = message.parts 
                ? message.parts.filter((p: any) => p.type === 'tool-invocation').map((p: any) => p.toolInvocation)
                : message.toolInvocations;

              return (
                <MessageBubble
                  key={message.id}
                  role={message.role as 'user' | 'assistant'}
                  content={message.content || getMessageText(message)}
                  toolInvocations={toolInvocations}
                  isPendingTool={!!message._isPendingTool}
                  onConfirmAction={(payload) => {
                    sendMessage(
                      { text: `Confirmed action for ${payload.toolName}. Please proceed using confirmed: true.` },
                      { body: { threadId } }
                    );
                  }}
                  onCancelAction={(payload) => {
                    sendMessage(
                      { text: `User cancelled action for ${payload.toolName}. Do not proceed.` },
                      { body: { threadId } }
                    );
                  }}
                />
              );
            })}

            {/* Retrieval indicator */}
            <div className="px-4">
              <RetrievalIndicator isActive={isSubmitted} />
            </div>

            {/* Typing indicator */}
            <div className="px-4">
              {isLoading && !isSubmitted && <TypingIndicator />}
            </div>

            {/* Error display */}
            {error && (
              <div className="mx-4 my-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300/80">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 text-red-300/60">{error.message || 'Failed to get a response.'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInput
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}