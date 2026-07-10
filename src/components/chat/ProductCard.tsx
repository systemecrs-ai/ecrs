'use client';

/**
 * ProductCard
 * 
 * Inline product recommendation card displayed within chat messages.
 * Shows product details in a compact, visually appealing glassmorphism card.
 */

interface ProductCardProps {
  name: string;
  brand: string;
  price: number;
  currency?: string;
  colors: string[];
  sizes: string[];
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
  colors,
  sizes,
  material,
  rating,
  reviewCount,
  inStock,
  category,
}: ProductCardProps) {
  const stars = Math.round(rating);

  return (
    <div className="group my-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/5">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
              {name}
            </h4>
            <p className="text-xs text-white/40 mt-0.5">{brand} · {category}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              ${price.toFixed(2)}
            </span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">{currency}</span>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {/* Rating */}
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300/90">
            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
            <span className="text-white/30 ml-0.5">({reviewCount})</span>
          </span>
          
          {/* Stock status */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
            inStock 
              ? 'bg-emerald-500/10 text-emerald-300/90' 
              : 'bg-red-500/10 text-red-300/90'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {inStock ? 'In Stock' : 'Out of Stock'}
          </span>

          {/* Material */}
          <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">
            {material}
          </span>
        </div>

        {/* Colors & Sizes */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-white/40">
          {colors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/25">Colors:</span>
              <span className="text-white/60">{colors.slice(0, 4).join(', ')}{colors.length > 4 ? ` +${colors.length - 4}` : ''}</span>
            </div>
          )}
          {sizes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/25">Sizes:</span>
              <span className="text-white/60">{sizes.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
