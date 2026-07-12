'use client';

/**
 * ProductCard
 * 
 * Inline product recommendation card displayed within chat messages and canvas.
 * Shows product details in a compact, visually appealing glassmorphism card.
 */

interface ProductCardProps {
  name: string;
  brand: string;
  price: number;
  currency?: string;
  colors?: string[];
  sizes?: string[];
  material: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  category: string;
  imageUrl?: string;
}

export default function ProductCard({
  name,
  brand,
  price,
  currency = 'USD',
  colors = [],
  sizes = [],
  material,
  rating,
  reviewCount,
  inStock,
  category,
  imageUrl,
}: ProductCardProps) {
  const stars = Math.round(rating);

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
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">
              {brand}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating.toFixed(1)} <span className="text-white/30">({reviewCount})</span>
            </span>
          </div>
          
          <h3 className="line-clamp-2 text-sm font-medium text-white/90 transition-colors group-hover:text-indigo-300">
            {name}
          </h3>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40">{category}</span>
            <span className="text-[10px] text-white/40">{material}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold tracking-tight text-white">
              ${price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Colors & Sizes (if available) */}
        {(colors.length > 0 || sizes.length > 0) && (
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-white/40">
            {colors.length > 0 && (
              <span className="truncate">
                {colors.slice(0, 3).join(', ')}{colors.length > 3 && '...'}
              </span>
            )}
            {sizes.length > 0 && (
              <span className="truncate">
                {sizes.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
