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
          {/* Overlay Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 sm:p-12 pointer-events-none"
          >
            {/* Clickable Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" 
              onClick={onClose} 
            />

            {/* Modal Card */}
            <motion.div
              layoutId={`card-${product.sku}`}
              className="relative z-10 w-full max-w-4xl bg-[#0a0a14] rounded-3xl shadow-2xl flex flex-col md:flex-row border border-white/[0.08] pointer-events-auto overflow-hidden max-h-full"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur-xl border border-white/[0.1] transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Product Image */}
              <motion.div 
                layoutId={`image-${product.sku}`}
                className="relative w-full md:w-1/2 shrink-0 aspect-[4/3] md:aspect-auto overflow-hidden bg-white/[0.02]"
              >
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-transparent opacity-80 md:hidden" />
                
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
              </motion.div>

              {/* Product Info */}
              <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
                <div className="p-6 md:p-8 flex-1">
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
                  <motion.h2 
                    layoutId={`title-${product.sku}`}
                    className="text-2xl font-bold text-white tracking-tight leading-tight mb-2"
                  >
                    {product.name}
                  </motion.h2>
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
                  <div className="flex items-center gap-2">
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

                {/* Sticky Footer CTA */}
                <div className="border-t border-white/[0.08] p-6 bg-[#0a0a14]">
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
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
