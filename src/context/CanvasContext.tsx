'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CanvasView = 'DEFAULT_CANVAS' | 'PRODUCT_RESULTS';

interface CanvasState {
  activeView: CanvasView;
  viewData: any[]; // Array of product items
}

interface CanvasContextType extends CanvasState {
  setCanvasView: (view: CanvasView, data?: any[]) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CanvasState>({
    activeView: 'DEFAULT_CANVAS',
    viewData: [],
  });

  const setCanvasView = (view: CanvasView, data: any[] = []) => {
    setState({ activeView: view, viewData: data });
  };

  return (
    <CanvasContext.Provider value={{ ...state, setCanvasView }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
