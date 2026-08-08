'use client';

/**
 * ProductCard
 * 
 * Interactive product card with size selector pills, stock indicator,
 * star ratings, and dual action buttons (Quick Add + Inspect Specs).
 * 
 * All non-essential props are optional so the card works with both
 * the full mock data shape and the lean CanvasProduct from the backend.
 */

import { useState } from 'react';
import { ShoppingCart, Search, CheckCircle2, Star } from 'lucide-react';

interface ProductCardProps {
  sku: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  inStock?: boolean;
  brand?: string;
  currency?: string;
  colors?: string[];
  sizes?: string[];
  material?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  onAddToCart?: (sku: string, size: string) => void;
  onInspect?: (sku: string) => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];

export default function ProductCard({
  sku,
  name,
  price,
  description,
  imageUrl,
  inStock = true,
  brand,
  currency = 'USD',
  colors = [],
  sizes,
  material,
  rating,
  reviewCount,
  category,
  onAddToCart,
  onInspect,
}: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [justAdded, setJustAdded] = useState(false);

  const displaySizes = sizes && sizes.length > 0 ? sizes : DEFAULT_SIZES;
  const stars = rating ? Math.round(rating) : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart && inStock) {
      onAddToCart(sku, selectedSize);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    }
  };

  const handleInspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInspect?.(sku);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-xl backdrop-blur-xl transition-all duration-500 hover:border-indigo-500/30 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/10">
      {/* Image Area */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/[0.02]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 transition-transform duration-500 group-hover:scale-105">
            <svg className="h-8 w-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40" />
        
        {/* Badges on Image */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {inStock ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-medium tracking-wide text-emerald-300 backdrop-blur-md border border-emerald-500/20">
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-medium tracking-wide text-red-300 backdrop-blur-md border border-red-500/20">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            {brand && (
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">
                {brand}
              </span>
            )}
            {rating != null && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
                {reviewCount != null && (
                  <span className="text-white/30">({reviewCount})</span>
                )}
              </span>
            )}
          </div>
          
          <h3 className="line-clamp-2 text-sm font-medium text-white/90 transition-colors group-hover:text-indigo-300">
            {name}
          </h3>
        </div>

        {/* Size Selector Pills */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {displaySizes.map((size) => (
              <button
                key={size}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSize(size);
                }}
                className={`flex h-7 min-w-[32px] items-center justify-center rounded-lg text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                  selectedSize === size
                    ? 'bg-indigo-600/70 text-white border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            {category && (
              <span className="text-[10px] text-white/40">{category}</span>
            )}
            {material && (
              <span className="text-[10px] text-white/40">{material}</span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold tracking-tight text-white">
              ${price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2 pt-3 border-t border-white/[0.06]">
          <button
            onClick={handleQuickAdd}
            disabled={!inStock || justAdded}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition-all duration-300 active:scale-[0.97] ${
              justAdded
                ? 'bg-emerald-600/80 text-white border border-emerald-500/30'
                : inStock
                ? 'bg-gradient-to-r from-indigo-600/80 to-violet-600/80 text-white border border-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-md hover:shadow-indigo-500/20'
                : 'bg-white/[0.03] text-white/25 border border-white/[0.06] cursor-not-allowed'
            }`}
          >
            {justAdded ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="h-3 w-3" />
                Quick Add
              </>
            )}
          </button>
          
          <button
            onClick={handleInspect}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[11px] font-semibold text-white/60 transition-all hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            <Search className="h-3 w-3" />
            Specs
          </button>
        </div>
      </div>
    </div>
  );
}
