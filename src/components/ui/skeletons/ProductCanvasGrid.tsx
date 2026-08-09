import { motion } from 'framer-motion';

export default function PremiumSkeletonGrid() {
  // Array of 8 to fill out a standard desktop screen perfectly
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header Skeleton */}
      <div className="mb-10">
        <div className="h-8 w-64 bg-white/10 rounded-md animate-pulse mb-3"></div>
        <div className="h-4 w-48 bg-white/5 rounded-md animate-pulse"></div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {skeletons.map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="flex flex-col p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-xl"
          >
            {/* Image Skeleton */}
            <div className="w-full aspect-[4/5] bg-white/10 rounded-xl animate-pulse mb-4"></div>
            
            {/* Title & Brand Skeleton */}
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-white/10 rounded-md animate-pulse"></div>
                <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse"></div>
              </div>
              <div className="h-5 w-12 bg-white/10 rounded-full animate-pulse ml-4"></div>
            </div>

            {/* Price Skeleton */}
            <div className="h-5 w-16 bg-white/10 rounded-md animate-pulse mb-4"></div>

            {/* Action Buttons Skeleton */}
            <div className="mt-auto flex gap-2 pt-4 border-t border-white/[0.05]">
              <div className="h-10 flex-1 bg-white/10 rounded-lg animate-pulse"></div>
              <div className="h-10 w-10 bg-white/10 rounded-lg animate-pulse flex-shrink-0"></div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}