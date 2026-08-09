'use client';

/**
 * ProductResultsCanvas
 * 
 * High-density product grid displayed when updateProductCanvas fires.
 * Connected to CanvasContext for product data and CartContext for add-to-cart.
 * Features interactive product cards with size selectors and a detail drawer.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid3X3, LayoutGrid } from 'lucide-react';
import type { CanvasProduct } from '@/context/CanvasContext';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/chat/ProductCard';
import ProductDetailDrawer from './ProductDetailDrawer';

interface ProductResultsCanvasProps {
  products: CanvasProduct[];
  onBack: () => void;
}

export default function ProductResultsCanvas({ products, onBack }: ProductResultsCanvasProps) {
  const { addItem } = useCart();
  const [inspectProduct, setInspectProduct] = useState<CanvasProduct | null>(null);

  const handleAddToCart = (sku: string, size: string) => {
    const product = products.find(p => p.sku === sku);
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
    const product = products.find(p => p.sku === sku);
    if (product) {
      setInspectProduct(product);
    }
  };

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
                transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
        )}
      </div>

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
