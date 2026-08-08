'use client';

import { motion } from 'framer-motion';
import { useCanvas } from '@/context/CanvasContext';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/chat/ProductCard';
import ProductDetailDrawer from '@/components/canvas/ProductDetailDrawer';
import type { CanvasProduct } from '@/context/CanvasContext';
import { Sparkles, ShoppingBag, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import PremiumSkeletonGrid from './skeletons/ProductCanvasGrid';

export default function ProductCanvas() {
  const { viewData, activeView, setAllProducts, resetToDefaultCanvas, isLoading } = useCanvas();
  const { addItem } = useCart();
  const [inspectProduct, setInspectProduct] = useState<CanvasProduct | null>(null);
  
  // 👉 NEW: Track the initial database fetch separately from AI loading
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial fetch for the complete catalog
  useEffect(() => {
    let isMounted = true;
    
    const fetchCatalog = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch catalog');
        
        const data = await response.json();
        
        if (isMounted && data.products) {
          setAllProducts(data.products);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        if (isMounted) {
          // Add a tiny artificial delay (300ms) so the beautiful skeleton 
          // isn't a jarring flash if the DB is incredibly fast.
          setTimeout(() => setIsInitialLoad(false), 300);
        }
      }
    };

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [setAllProducts]);

  const handleAddToCart = (sku: string, size: string) => {
    const product = viewData.find(p => p.sku === sku);
    if (product) {
      addItem({
        sku: product.sku,
        quantity: 1,
        size,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
  };

  const handleInspect = (sku: string) => {
    const product = viewData.find(p => p.sku === sku);
    if (product) setInspectProduct(product);
  };

  const hasProducts = viewData.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-black p-6 md:p-8 lg:p-12 scrollbar-thin relative">
      
      {/* 👉 NEW: Enterprise Skeleton Loading State */}
      {isInitialLoad ? (
        <PremiumSkeletonGrid />
      ) : hasProducts ? (
        /* ── Product Grid (Real Data) ─────────────────────────── */
        <div className="mx-auto max-w-7xl relative">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              {activeView === 'PRODUCT_RESULTS' && (
                <button
                  onClick={resetToDefaultCanvas}
                  className="group flex items-center gap-2 mb-4 rounded-lg py-1.5 pr-4 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Back to All Products
                </button>
              )}
              <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                {activeView === 'DEFAULT_CANVAS' ? 'Complete Catalog' : 'AI Top Picks'}
                {activeView === 'PRODUCT_RESULTS' && <Sparkles className="h-6 w-6 text-indigo-400" />}
              </h2>
              <p className="mt-2 text-sm text-white/50">
                {viewData.length} product{viewData.length !== 1 ? 's' : ''} {activeView === 'PRODUCT_RESULTS' ? 'found based on your conversation' : 'available in the store'}.
              </p>
            </div>
            
            {/* AI Action Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                Updating Canvas...
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {viewData.map((product, i) => (
              <motion.div
                key={product.sku}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductCard
                  sku={product.sku}
                  name={product.name}
                  price={product.price}
                  description={product.description}
                  imageUrl={product.imageUrl}
                  inStock={product.inStock}
                  brand={product.brand}
                  currency={product.currency}
                  onAddToCart={handleAddToCart}
                  onInspect={handleInspect}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Premium Empty State ──────────────────────────────── */
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-lg px-6">
            <div className="relative mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 border border-indigo-500/10"
              >
                <Layers className="h-10 w-10 text-indigo-400/50" />
                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                </motion.div>
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -bottom-1 -left-3 flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/15"
                >
                  <ShoppingBag className="h-3 w-3 text-cyan-400" />
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                Your Product Canvas
              </h2>
              <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-sm mx-auto">
                Ask the AI assistant to find products and they'll appear here in an interactive grid.
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <ProductDetailDrawer
        product={inspectProduct}
        isOpen={inspectProduct !== null}
        onClose={() => setInspectProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

