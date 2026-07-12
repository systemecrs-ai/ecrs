'use client';

import { motion } from 'framer-motion';
import { mockProducts } from '@/lib/mock-products';
import ProductCard from '@/components/chat/ProductCard';

export default function ProductCanvas() {
  return (
    <div className="flex-1 overflow-y-auto bg-black p-6 md:p-8 lg:p-12 overflow-y-auto">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Discover Collection
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Curated apparel powered by AI insights and real-time inventory.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
          {mockProducts.map((product, i) => (
            <motion.div
              key={product.sku}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Wrapping ProductCard with motion or directly using it. 
                  ProductCard requires some props. The mock data has them. 
                  Wait, mock data doesn't have 'colors', 'sizes'. I need to add them or make them optional in ProductCard, or pass empty arrays. */}
              <ProductCard
                name={product.name}
                brand={product.brand}
                price={product.price}
                currency={product.currency}
                colors={[]} 
                sizes={[]} 
                material={product.material}
                rating={product.rating}
                reviewCount={product.reviewCount}
                inStock={product.inStock}
                category={product.category}
                imageUrl={product.imageUrl}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
