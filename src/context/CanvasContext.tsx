'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ─── Domain Model ───────────────────────────────────────────────────────────
// Matches the hydrated output shape from the updateProductCanvas backend tool.
// See: src/infrastructure/tools/index.ts → updateProductCanvas.execute()

/**
 * Strict product interface representing a hydrated product displayed on the canvas.
 * Fields mirror the backend tool's `data.items[]` output exactly, with optional
 * fields for properties that may or may not be included in the hydration map.
 */
export interface CanvasProduct {
  sku: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  inStock: boolean;
  /** Optional — included if the backend hydration map is extended */
  brand?: string;
  /** Optional — defaults to 'USD' in rendering if absent */
  currency?: string;
}

// ─── Canvas State Types ─────────────────────────────────────────────────────

export type CanvasView = 'DEFAULT_CANVAS' | 'PRODUCT_RESULTS';

interface CanvasState {
  activeView: CanvasView;
  viewData: CanvasProduct[];
  isLoading: boolean;
}

interface CanvasContextType extends CanvasState {
  setCanvasView: (view: CanvasView, data?: CanvasProduct[]) => void;
  setCanvasLoading: (loading: boolean) => void;
  getCanvasSummary: () => string;
}

// ─── Context & Provider ─────────────────────────────────────────────────────

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CanvasState>({
    activeView: 'DEFAULT_CANVAS',
    viewData: [],
    isLoading: false,
  });

  const setCanvasView = useCallback((view: CanvasView, data: CanvasProduct[] = [], loading: boolean = false) => {
    setState({ activeView: view, viewData: data, isLoading: loading });
  }, []);

  const setCanvasLoading = (loading: boolean) => {
  setState(prev => ({ ...prev, isLoading: loading }));
};

  /**
   * Serializes the current canvas view into a lightweight string
   * so the LLM can "see" what's on screen and resolve pronouns
   * like "the first one", "those", or "that shirt".
   *
   * Injected into every chat request body as `canvasState`.
   */
  const getCanvasSummary = useCallback((): string => {
    if (state.viewData.length === 0) return 'Nothing';
    return state.viewData
      .map((p, i) => `Item ${i + 1}: ${p.name} (${p.sku}) - $${p.price.toFixed(2)}`)
      .join(' | ');
  }, [state.viewData]);

  return (
    <CanvasContext.Provider value={{ ...state, setCanvasView, getCanvasSummary, setCanvasLoading }}>
      {children}
    </CanvasContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
