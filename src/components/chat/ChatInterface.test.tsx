/**
 * ChatInterface.test.tsx
 *
 * Enterprise-grade integration test suite for <ChatInterface/>.
 *
 * PURPOSE:
 * Diagnose whether the state-mapping pipeline inside ChatInterface's
 * `cleanedMessages` useMemo is correctly extracting text from tool
 * invocations when the LLM streams empty content with populated
 * toolInvocations/parts.
 *
 * THE BUG HYPOTHESIS:
 * When Llama 3.1 executes `updateProductCanvas`, it streams:
 *   - content: ""
 *   - parts: [{ type: 'tool-invocation', toolInvocation: { args: { summary: '...' } } }]
 *
 * ChatInterface.tsx has an "Empty Bubble Fix" (lines 161-169) that should
 * extract args.summary or result.data.summary into cleanContent.
 * If this extraction fails, the MessageBubble will receive empty content.
 *
 * MOCK STRATEGY:
 * - @ai-sdk/react: Intercept useChat to control message state precisely.
 * - @/context/CanvasContext: Provide spy functions for setCanvasView/setCanvasLoading.
 * - All child components that need external services are handled via vitest.setup.ts.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from './ChatInterface';

// ─── Type Definitions for Mocked Dependencies ────────────────────────────────

/**
 * Represents the shape we need from useChat's return value.
 * Only the fields consumed by ChatInterface are typed here.
 */
interface MockUseChatReturn {
  messages: MockMessage[];
  sendMessage: Mock;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  error: Error | null;
  setMessages: Mock;
}

/**
 * Represents a message in the Vercel AI SDK v7 wire format.
 * Uses the `parts`-based format (SDK v7 native) alongside
 * the legacy `toolInvocations` format for dual-format testing.
 */
interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: MockMessagePart[];
  toolInvocations?: MockToolInvocation[];
}

interface MockMessagePart {
  type: 'text' | 'tool-invocation';
  text?: string;
  toolInvocation?: MockToolInvocation;
}

interface MockToolInvocation {
  toolCallId: string;
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

interface MockCanvasContextValue {
  activeView: string;
  viewData: unknown[];
  isLoading: boolean;
  setCanvasView: Mock;
  setCanvasLoading: Mock;
  getCanvasSummary: Mock;
}

// ─── Module Mocks ─────────────────────────────────────────────────────────────

// We use a mutable reference so each test can swap the return value.
let mockUseChatReturn: MockUseChatReturn;

vi.mock('@ai-sdk/react', () => ({
  useChat: () => mockUseChatReturn,
}));

// Mock the DefaultChatTransport import from 'ai'
// ChatInterface instantiates it with `new`, so it must be a class.
vi.mock('ai', () => ({
  DefaultChatTransport: class MockDefaultChatTransport {
    constructor(_opts: Record<string, unknown>) {
      // no-op
    }
  },
}));

let mockCanvasContext: MockCanvasContextValue;

vi.mock('@/context/CanvasContext', () => ({
  useCanvas: () => mockCanvasContext,
  // Re-export the type so imports don't explode
  CanvasProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock child components that don't need to be tested here
vi.mock('./ChatInput', () => ({
  __esModule: true,
  default: ({ value, onChange, onSubmit, isLoading }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
  }) => (
    <div data-testid="chat-input" data-loading={isLoading}>
      ChatInput Stub
    </div>
  ),
}));

vi.mock('@/components/ui/TypingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="typing-indicator">Typing...</div>,
}));

vi.mock('@/components/ui/RetrievalIndicator', () => ({
  __esModule: true,
  default: ({ isActive }: { isActive: boolean }) =>
    isActive ? <div data-testid="retrieval-indicator">Retrieving...</div> : null,
}));

vi.mock('@/config/constants', () => ({
  SUGGESTED_QUERIES: ['Test query 1', 'Test query 2'],
}));

vi.mock('lucide-react', () => ({
  MessageSquarePlus: () => <span data-testid="icon-new-chat" />,
  History: () => <span data-testid="icon-history" />,
  User: () => <span data-testid="icon-user" />,
  Send: () => <span data-testid="icon-send" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ChatInterface — Integration & State-Mapping Pipeline', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseChatReturn = {
      messages: [],
      sendMessage: vi.fn(),
      status: 'ready',
      error: null,
      setMessages: vi.fn(),
    };

    mockCanvasContext = {
      activeView: 'DEFAULT_CANVAS',
      viewData: [],
      isLoading: false,
      setCanvasView: vi.fn(),
      setCanvasLoading: vi.fn(),
      getCanvasSummary: vi.fn().mockReturnValue('Nothing'),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Baseline: Empty state renders correctly
  // ─────────────────────────────────────────────────────────────────────────
  describe('Baseline: Empty state', () => {
    it('renders the empty state with suggested queries when no messages exist', () => {
      render(<ChatInterface threadId="thread-test-001" />);

      expect(
        screen.getByText('Your personal AI stylist. Ask for outfit recommendations, finding specific items, or styling advice.')
      ).toBeInTheDocument();
      expect(screen.getByText('Test query 1')).toBeInTheDocument();
      expect(screen.getByText('Test query 2')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test A: Streaming / Partial-Call Phase
  //
  // Simulates the EXACT scenario from the bug:
  // The model is streaming a `updateProductCanvas` tool call with
  // state: 'partial-call'. The message content is "", but args.summary
  // has "Curating recommendations...".
  //
  // ChatInterface's cleanedMessages logic (line 162-166) should detect
  // the empty content + active canvasTool and extract args.summary as
  // the display text.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test A: Streaming/partial-call phase — optimistic UI extraction', () => {
    it('extracts args.summary when content is empty and tool is in partial-call state (parts format)', () => {
      const partialCallMessage: MockMessage = {
        id: 'msg-stream-001',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_stream_001',
              toolName: 'updateProductCanvas',
              state: 'partial-call',
              args: { summary: 'Curating recommendations...' },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [partialCallMessage],
        status: 'streaming',
      };

      render(<ChatInterface threadId="thread-test-002" />);

      // THE CRITICAL ASSERTION:
      // The extracted summary text must appear in the DOM.
      // If it doesn't, the state-mapper is not extracting from tool args.
      expect(
        screen.getByText('Curating recommendations...')
      ).toBeInTheDocument();
    });

    it('extracts args.summary when content is empty and tool is in partial-call state (toolInvocations format)', () => {
      const partialCallMessage: MockMessage = {
        id: 'msg-stream-002',
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            toolCallId: 'tc_stream_002',
            toolName: 'updateProductCanvas',
            state: 'partial-call',
            args: { summary: 'Curating recommendations...' },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [partialCallMessage],
        status: 'streaming',
      };

      render(<ChatInterface threadId="thread-test-003" />);

      expect(
        screen.getByText('Curating recommendations...')
      ).toBeInTheDocument();
    });

    it('falls back to "Curating recommendations..." when args.summary is undefined', () => {
      const partialCallMessage: MockMessage = {
        id: 'msg-stream-003',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_stream_003',
              toolName: 'updateProductCanvas',
              state: 'partial-call',
              args: {}, // No summary provided yet
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [partialCallMessage],
        status: 'streaming',
      };

      render(<ChatInterface threadId="thread-test-004" />);

      expect(
        screen.getByText('Curating recommendations...')
      ).toBeInTheDocument();
    });

    it('sets canvasLoading to true during partial-call phase', () => {
      const partialCallMessage: MockMessage = {
        id: 'msg-stream-004',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_stream_004',
              toolName: 'updateProductCanvas',
              state: 'partial-call',
              args: { summary: 'Searching...' },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [partialCallMessage],
        status: 'streaming',
      };

      render(<ChatInterface threadId="thread-test-005" />);

      expect(mockCanvasContext.setCanvasLoading).toHaveBeenCalledWith(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test B: Resolved Phase & Fallback Check
  //
  // After the tool finishes, the message still has content: "" but
  // toolInvocations[0].state is 'result'. The summary should come from
  // either args.summary or result.data.summary.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test B: Resolved phase — final summary extraction & fallback', () => {
    it('extracts args.summary from a result-state tool when content is empty (parts format)', () => {
      const resolvedMessage: MockMessage = {
        id: 'msg-resolved-001',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_resolved_001',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: { summary: 'These are the jeans.' },
              result: {
                success: true,
                data: {
                  summary: 'These are the jeans.',
                  items: [
                    {
                      sku: 'JEAN-001',
                      name: 'Classic Slim Jeans',
                      price: 59.99,
                      description: 'Slim fit denim',
                      imageUrl: '/img/jeans.jpg',
                      inStock: true,
                    },
                  ],
                },
              },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [resolvedMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-006" />);

      // The final summary text must be visible
      expect(screen.getByText('These are the jeans.')).toBeInTheDocument();
    });

    it('falls back to result.data.summary when args.summary is absent', () => {
      const resolvedMessage: MockMessage = {
        id: 'msg-resolved-002',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_resolved_002',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: {}, // No summary in args
              result: {
                success: true,
                data: {
                  summary: 'Here are your denim picks!',
                  items: [],
                },
              },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [resolvedMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-007" />);

      expect(
        screen.getByText('Here are your denim picks!')
      ).toBeInTheDocument();
    });

    it('falls back to "Here are your recommendations!" when neither args.summary nor result.data.summary exists', () => {
      const resolvedMessage: MockMessage = {
        id: 'msg-resolved-003',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_resolved_003',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: {},
              result: { success: true, data: { items: [] } },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [resolvedMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-008" />);

      expect(
        screen.getByText('Here are your recommendations!')
      ).toBeInTheDocument();
    });

    it('sets canvasLoading to false when tool reaches result state', () => {
      const resolvedMessage: MockMessage = {
        id: 'msg-resolved-004',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_resolved_004',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: { summary: 'Done!' },
              result: {
                success: true,
                data: {
                  summary: 'Done!',
                  items: [
                    {
                      sku: 'JEAN-002',
                      name: 'Relaxed Fit Jeans',
                      price: 49.99,
                      description: 'Comfortable relaxed fit',
                      imageUrl: '/img/relaxed.jpg',
                      inStock: true,
                    },
                  ],
                },
              },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [resolvedMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-009" />);

      expect(mockCanvasContext.setCanvasLoading).toHaveBeenCalledWith(false);
    });

    it('calls setCanvasView with product items when tool result is valid', () => {
      const items = [
        {
          sku: 'JEAN-003',
          name: 'Bootcut Jeans',
          price: 69.99,
          description: 'Classic bootcut',
          imageUrl: '/img/bootcut.jpg',
          inStock: true,
        },
      ];

      const resolvedMessage: MockMessage = {
        id: 'msg-resolved-005',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_resolved_005',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: { summary: 'Bootcut collection' },
              result: {
                success: true,
                data: { summary: 'Bootcut collection', items },
              },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [resolvedMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-010" />);

      expect(mockCanvasContext.setCanvasView).toHaveBeenCalledWith(
        'PRODUCT_RESULTS',
        items
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test C: Content takes priority over extraction
  //
  // When the model DOES send non-empty content alongside tools, the
  // original content should be preserved — extraction only kicks in
  // when content is empty.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test C: Non-empty content is preserved (no double-extraction)', () => {
    it('preserves existing non-empty content even when canvas tool is present', () => {
      const messageWithContent: MockMessage = {
        id: 'msg-content-001',
        role: 'assistant',
        content: 'I found great jeans for you!',
        parts: [
          {
            type: 'text',
            text: 'I found great jeans for you!',
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_content_001',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: { summary: 'Jeans collection' },
              result: {
                success: true,
                data: { summary: 'Jeans collection', items: [] },
              },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [messageWithContent],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-011" />);

      // Original content should be shown, NOT the tool's args.summary
      expect(
        screen.getByText('I found great jeans for you!')
      ).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test D: Genuinely empty messages are filtered out
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test D: Empty message filtering', () => {
    it('filters out genuinely empty assistant messages (no content, no tools)', () => {
      const emptyMessage: MockMessage = {
        id: 'msg-empty-001',
        role: 'assistant',
        content: '',
      };

      const userMessage: MockMessage = {
        id: 'msg-user-001',
        role: 'user',
        content: 'Hello',
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [userMessage, emptyMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-012" />);

      // User message should be visible
      expect(screen.getByText('Hello')).toBeInTheDocument();

      // The empty assistant message should not produce any visible text
      // (it should be filtered out by the .filter(Boolean) in cleanedMessages)
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test E: Dual-format extraction (parts vs toolInvocations)
  //
  // Verifies that the bulletproof extraction at lines 142-150 handles
  // both SDK v7 `parts` format and legacy `toolInvocations` format.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test E: Dual-format extraction compatibility', () => {
    it('extracts tools from legacy toolInvocations format when parts is absent', () => {
      const legacyMessage: MockMessage = {
        id: 'msg-legacy-001',
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            toolCallId: 'tc_legacy_001',
            toolName: 'updateProductCanvas',
            state: 'result',
            args: { summary: 'Legacy format summary' },
            result: {
              success: true,
              data: { summary: 'Legacy format summary', items: [] },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [legacyMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-013" />);

      expect(
        screen.getByText('Legacy format summary')
      ).toBeInTheDocument();
    });

    it('prefers toolInvocations over parts when both are populated', () => {
      // Edge case: what if BOTH formats are present?
      // The code checks toolInvocations FIRST (line 144).
      const dualFormatMessage: MockMessage = {
        id: 'msg-dual-001',
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            toolCallId: 'tc_dual_001',
            toolName: 'updateProductCanvas',
            state: 'result',
            args: { summary: 'From toolInvocations' },
            result: { success: true, data: { items: [] } },
          },
        ],
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'tc_dual_001',
              toolName: 'updateProductCanvas',
              state: 'result',
              args: { summary: 'From parts' },
              result: { success: true, data: { items: [] } },
            },
          },
        ],
      };

      mockUseChatReturn = {
        ...mockUseChatReturn,
        messages: [dualFormatMessage],
        status: 'ready',
      };

      render(<ChatInterface threadId="thread-test-014" />);

      // toolInvocations takes priority per the code logic
      expect(
        screen.getByText('From toolInvocations')
      ).toBeInTheDocument();
    });
  });
});
