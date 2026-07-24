/**
 * Admin Loading State
 * 
 * Shown automatically by Next.js (via React Suspense) when
 * navigating between admin tabs. Provides a polished skeleton
 * that mirrors the admin content area layout.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="flex h-screen w-64 flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
          <div className="h-6 w-6 rounded bg-white/10 animate-pulse" />
          <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-40 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-72 rounded bg-white/[0.06] animate-pulse" />
        </div>

        <div className="rounded-2xl border border-white/[0.05] bg-neutral-900/50 p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-white/[0.03] px-6 py-4 last:border-0"
            >
              <div className="h-5 w-5 rounded-full bg-white/10 animate-pulse" />
              <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
