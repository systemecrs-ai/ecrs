'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

interface Product {
  sku?: string;
  name: string;
  brand: string;
  price: number;
  currency?: string;
  inStock: boolean;
  imageUrl?: string;
  description?: string;
}

interface ProductResultsCanvasProps {
  products: Product[];
  onBack: () => void;
}

export default function ProductResultsCanvas({ products, onBack }: ProductResultsCanvasProps) {
  return (
    <div className="flex h-full w-full flex-col bg-black/40 backdrop-blur-md">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center border-b border-white/[0.08] bg-black/60 px-8 py-4 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 rounded-lg py-2 pr-4 text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Main Canvas
        </button>
        <h2 className="ml-4 text-lg font-semibold text-white tracking-tight">Product Results</h2>
        <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
          <span>{products.length} items found</span>
        </div>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        {products.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <p>No products found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, idx) => (
              <motion.div
                key={product.sku || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-lg transition-all hover:border-indigo-500/30 hover:bg-white/[0.04] hover:shadow-indigo-500/10"
              >
                {/* Image Placeholder or actual image */}
                <div className="aspect-[4/5] w-full overflow-hidden bg-white/[0.02]">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/10">
                      No Image
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-400">
                    {product.brand}
                  </div>
                  <h3 className="mb-2 line-clamp-2 flex-1 text-base font-semibold leading-tight text-white">
                    {product.name}
                  </h3>
                  
                  {product.sku && (
                    <div className="mb-3 text-xs text-white/40">
                      SKU: {product.sku}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.06]">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-white">
                        ${product.price.toFixed(2)} {product.currency || 'USD'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {product.inStock ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          In Stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
