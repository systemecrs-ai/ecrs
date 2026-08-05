/**
 * MessageBubble.test.tsx
 *
 * Enterprise-grade component-isolation test suite for <MessageBubble/>.
 *
 * PURPOSE:
 * Diagnose whether text content is being dropped at the RENDER layer
 * when a tool invocation is present alongside text content.
 *
 * THE BUG HYPOTHESIS:
 * When the Llama 3.1 model calls `updateProductCanvas`, it streams empty
 * text (content: "") but populates toolInvocations with summary args.
 * The ChatInterface.tsx state-mapper extracts that summary into `content`,
 * but MessageBubble.tsx may silently swallow it if its rendering logic
 * treats tool invocations and text as mutually exclusive.
 *
 * TEST STRATEGY:
 * - Test A: Baseline — standard text renders correctly.
 * - Test B: The suspected bug — text coexisting with tool invocations.
 * - Test C: Pending/streaming state — loading UI renders correctly.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';

// ─── Shared Fixtures ─────────────────────────────────────────────────────────

/** Minimal tool invocation representing a resolved updateProductCanvas call */
interface MockToolInvocation {
  toolCallId: string;
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

function createCanvasToolInvocation(
  overrides: Partial<MockToolInvocation> = {}
): MockToolInvocation {
  return {
    toolCallId: 'tc_canvas_001',
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
    ...overrides,
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('MessageBubble — Component Isolation', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST A: Standard Text Rendering (Baseline)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test A: Standard text rendering', () => {
    it('renders plain assistant text content', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Hello"
        />
      );

      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('renders user message text content', () => {
      render(
        <MessageBubble
          role="user"
          content="Show me some jeans"
        />
      );

      expect(screen.getByText('Show me some jeans')).toBeInTheDocument();
    });

    it('returns null for genuinely empty messages (no content, no tools)', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content=""
        />
      );

      // Component should render nothing — the container should be empty
      expect(container.innerHTML).toBe('');
    });

    it('returns null when content is empty and toolInvocations is an empty array', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content=""
          toolInvocations={[]}
        />
      );

      expect(container.innerHTML).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST B: The Suspected Bug — Text + Tool Invocation Coexistence
  //
  // CRITICAL: This test asserts that when BOTH `content` and
  // `toolInvocations` are populated, the text content MUST be rendered.
  //
  // If MessageBubble's render logic hides text when tools are present,
  // this test WILL FAIL — which is exactly the behavior we need to catch.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test B: Text + Tool invocation coexistence (the suspected bug)', () => {
    it('renders text content ALONGSIDE a resolved updateProductCanvas tool', () => {
      const toolInvocations = [createCanvasToolInvocation({ state: 'result' })];

      render(
        <MessageBubble
          role="assistant"
          content="These are the jeans."
          toolInvocations={toolInvocations}
        />
      );

      // THE CRITICAL ASSERTION:
      // After ChatInterface extracts `args.summary` → content, the text
      // MUST be visible in the DOM, not swallowed by tool-rendering logic.
      expect(screen.getByText('These are the jeans.')).toBeInTheDocument();
    });

    it('renders text content alongside a partial-call tool invocation', () => {
      const toolInvocations = [
        createCanvasToolInvocation({
          state: 'partial-call',
          args: { summary: 'Curating recommendations...' },
        }),
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Curating recommendations..."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      expect(screen.getByText('Curating recommendations...')).toBeInTheDocument();
    });

    it('renders text content alongside a call-state tool invocation', () => {
      const toolInvocations = [
        createCanvasToolInvocation({
          state: 'call',
          args: { summary: 'Searching jeans...' },
        }),
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Searching jeans..."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      expect(screen.getByText('Searching jeans...')).toBeInTheDocument();
    });

    it('renders text even when multiple tools are present', () => {
      const toolInvocations: MockToolInvocation[] = [
        createCanvasToolInvocation({ state: 'result' }),
        {
          toolCallId: 'tc_inv_002',
          toolName: 'checkInventory',
          state: 'result',
          args: {},
          result: { available: true, storeId: 'STORE-01' },
        },
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Here are your jeans and inventory status."
          toolInvocations={toolInvocations}
        />
      );

      expect(
        screen.getByText('Here are your jeans and inventory status.')
      ).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST C: Pending Tool State — Loading UI
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test C: Pending tool state renders loading UI', () => {
    it('renders the animate-tool-pulse indicator when isPendingTool is true', () => {
      const toolInvocations = [
        createCanvasToolInvocation({
          state: 'partial-call',
          args: { summary: 'Finding products...' },
        }),
      ];

      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Finding products..."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      // The pulsing dot should be present
      const pulseElement = container.querySelector('.animate-tool-pulse');
      expect(pulseElement).toBeInTheDocument();
    });

    it('renders the shimmer progress bar when isPendingTool is true', () => {
      const toolInvocations = [
        createCanvasToolInvocation({
          state: 'call',
          args: { summary: 'Loading...' },
        }),
      ];

      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Loading..."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      // The shimmer bar should be present
      const shimmerElement = container.querySelector('.animate-shimmer');
      expect(shimmerElement).toBeInTheDocument();
    });

    it('does NOT render pulsing indicator when isPendingTool is false', () => {
      const toolInvocations = [createCanvasToolInvocation({ state: 'result' })];

      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Done!"
          toolInvocations={toolInvocations}
          isPendingTool={false}
        />
      );

      const pulseElement = container.querySelector('.animate-tool-pulse');
      expect(pulseElement).not.toBeInTheDocument();
    });

    it('applies dimmed text styling (text-white/70) when tool is pending', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Curating..."
          toolInvocations={[
            createCanvasToolInvocation({
              state: 'partial-call',
              args: { summary: 'Curating...' },
            }),
          ]}
          isPendingTool={true}
        />
      );

      // The prose-chat div should have the dimmed class
      const proseChatDiv = container.querySelector('.prose-chat');
      expect(proseChatDiv).toBeInTheDocument();
      expect(proseChatDiv).toHaveClass('text-white/70');
    });

    it('renders per-tool loading text for non-canvas tools in non-result state', () => {
      const toolInvocations: MockToolInvocation[] = [
        {
          toolCallId: 'tc_chk_001',
          toolName: 'checkInventory',
          state: 'call',
          args: {},
        },
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Let me check that for you."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      expect(
        screen.getByText('Checking store inventory...')
      ).toBeInTheDocument();
    });

    it('renders generic loading text for unknown tools in non-result state', () => {
      const toolInvocations: MockToolInvocation[] = [
        {
          toolCallId: 'tc_unknown_001',
          toolName: 'someNewTool',
          state: 'call',
          args: {},
        },
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Working on it..."
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      expect(
        screen.getByText('Running someNewTool...')
      ).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('renders when content is empty but toolInvocations are present (non-empty array)', () => {
      const toolInvocations = [
        createCanvasToolInvocation({
          state: 'call',
          args: { summary: 'Loading...' },
        }),
      ];

      // MessageBubble should NOT return null because toolInvocations exists
      const { container } = render(
        <MessageBubble
          role="assistant"
          content=""
          toolInvocations={toolInvocations}
          isPendingTool={true}
        />
      );

      // The component should render something (not be completely empty)
      expect(container.innerHTML).not.toBe('');
    });

    it('renders HITL confirmation card for reserveItemInStore result', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const toolInvocations: MockToolInvocation[] = [
        {
          toolCallId: 'tc_hitl_001',
          toolName: 'reserveItemInStore',
          state: 'result',
          args: {},
          result: {
            hitlRequired: true,
            data: {
              actionSummary: 'Reserve Classic Slim Jeans at Store #42?',
              toolName: 'reserveItemInStore',
            },
          },
        },
      ];

      render(
        <MessageBubble
          role="assistant"
          content="I found that item for you."
          toolInvocations={toolInvocations}
          onConfirmAction={onConfirm}
          onCancelAction={onCancel}
        />
      );

      expect(screen.getByText('Confirmation Required')).toBeInTheDocument();
      expect(
        screen.getByText('Reserve Classic Slim Jeans at Store #42?')
      ).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
});
