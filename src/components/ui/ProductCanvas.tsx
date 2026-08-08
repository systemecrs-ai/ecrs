'use client';

/**
 * ProductCanvas
 * 
 * The main left-pane workspace canvas. Displays real product data from
 * CanvasContext. When no products are loaded, shows a premium empty state
 * guiding users to interact with the AI assistant.
 * Handles both "Complete Catalog" and "AI Top Picks" views.
 */

import { motion } from 'framer-motion';
import { useCanvas } from '@/context/CanvasContext';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/chat/ProductCard';
import ProductDetailDrawer from '@/components/canvas/ProductDetailDrawer';
import type { CanvasProduct } from '@/context/CanvasContext';
import { Sparkles, ShoppingBag, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ProductCanvas() {
  const { viewData, activeView, setAllProducts, resetToDefaultCanvas, isLoading } = useCanvas();
  const { addItem } = useCart();
  const [inspectProduct, setInspectProduct] = useState<CanvasProduct | null>(null);

  // Initial fetch for the complete catalog
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      // Simulated fetch to load the complete catalog
      await new Promise(resolve => setTimeout(resolve, 600));
      if (isMounted) {
        setAllProducts([
          { sku: 'SKU-001', name: 'Classic White T-Shirt', price: 29.99, description: 'A timeless classic white t-shirt.', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', inStock: true, brand: 'Essentials' },
          { sku: 'SKU-002', name: 'Vintage Denim Jacket', price: 89.99, description: 'Rugged vintage denim jacket.', imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=800', inStock: true, brand: 'Levi' },
          { sku: 'SKU-003', name: 'Black Leather Boots', price: 149.99, description: 'Premium black leather boots.', imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&q=80&w=800', inStock: false, brand: 'Doc Martens' },
          { sku: 'SKU-004', name: 'Floral Summer Dress', price: 59.99, description: 'Lightweight floral dress for summer.', imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=800', inStock: true, brand: 'Zara' },
          { sku: 'SKU-005', name: 'Slim Fit Chinos', price: 49.99, description: 'Comfortable slim fit chinos for everyday wear.', imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800', inStock: true, brand: 'Dockers' },
          { sku: 'SKU-006', name: 'Cashmere Sweater', price: 129.99, description: 'Soft cashmere sweater for cold days.', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800', inStock: true, brand: 'J.Crew' }
        ]);
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
    if (product) {
      setInspectProduct(product);
    }
  };

  const hasProducts = viewData.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-black p-6 md:p-8 lg:p-12 scrollbar-thin relative">
      {hasProducts ? (
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
            
            {/* Loading Indicator for specific operations while grid is visible */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                Updating...
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
            {/* Animated Icon Cluster */}
            <div className="relative mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 border border-indigo-500/10"
              >
                <Layers className="h-10 w-10 text-indigo-400/50" />
                {/* Floating accent orbs */}
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
                {isLoading ? 'Loading catalog...' : "Ask the AI assistant to find products and they'll appear here in an interactive grid. Try asking for outfit recommendations, specific styles, or browse by category."}
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {[
                  { icon: '🔍', label: 'Smart Search' },
                  { icon: '👗', label: 'Style Matching' },
                  { icon: '📊', label: 'Live Inventory' },
                  { icon: '🛒', label: 'Quick Add to Cart' },
                ].map((feature) => (
                  <span
                    key={feature.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/40"
                  >
                    <span>{feature.icon}</span>
                    {feature.label}
                  </span>
                ))}
              </div>

              {/* Directional hint */}
              {!isLoading && (
                <div className="inline-flex items-center gap-2 text-xs text-indigo-400/60">
                  <span>Start a conversation with the AI</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
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
