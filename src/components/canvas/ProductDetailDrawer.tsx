'use client';

/**
 * ProductDetailDrawer
 * 
 * Slide-in drawer displaying full product details when "Inspect Specs" is clicked
 * on a product card. Shows large image, full description, available sizes,
 * stock status, price, and an "Add to Cart" CTA.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, CheckCircle2, XCircle, Star, Package, Tag } from 'lucide-react';
import type { CanvasProduct } from '@/context/CanvasContext';

interface ProductDetailDrawerProps {
  product: CanvasProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (sku: string, size: string) => void;
}

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL'];

export default function ProductDetailDrawer({ product, isOpen, onClose, onAddToCart }: ProductDetailDrawerProps) {
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    if (product && onAddToCart) {
      onAddToCart(product.sku, selectedSize);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-[56] flex h-full w-full max-w-[520px] flex-col border-l border-white/[0.08] bg-[#0a0a14]/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur-xl border border-white/[0.1] transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Product Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.02]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
                    <Package className="h-16 w-16 text-white/10" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-transparent" />
                
                {/* Stock Badge */}
                <div className="absolute left-5 top-5">
                  {product.inStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-300 backdrop-blur-xl border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-red-300 backdrop-blur-xl border border-red-500/20">
                      <XCircle className="h-3 w-3" />
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="px-6 pb-6 -mt-8 relative">
                {/* Brand */}
                {product.brand && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-indigo-400/70" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400/70">
                      {product.brand}
                    </span>
                  </div>
                )}

                {/* Name & Price */}
                <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-2">
                  {product.name}
                </h2>
                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-2xl font-bold text-white">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-white/30">
                    {product.currency || 'USD'}
                  </span>
                </div>

                {/* SKU */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">SKU</span>
                  <span className="text-xs font-mono text-white/60">{product.sku}</span>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description</h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {product.description}
                  </p>
                </div>

                {/* Size Selector */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Select Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`flex h-10 w-14 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ${
                          selectedSize === size
                            ? 'bg-indigo-600/80 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/20'
                            : 'bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Star Rating Placeholder */}
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/40">4.0+ rating</span>
                </div>
              </div>
            </div>

            {/* Sticky Footer CTA */}
            <div className="border-t border-white/[0.08] px-6 py-4 bg-[#0a0a14]/90 backdrop-blur-xl">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || addedToCart}
                className={`flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                  addedToCart
                    ? 'bg-emerald-600/80 text-white border border-emerald-500/30'
                    : product.inStock
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-500/30'
                    : 'bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed'
                }`}
              >
                {addedToCart ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    {product.inStock ? `Add to Cart — Size ${selectedSize}` : 'Out of Stock'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
