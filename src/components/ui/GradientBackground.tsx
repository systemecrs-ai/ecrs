'use client';

/**
 * GradientBackground
 * 
 * Animated gradient backdrop with floating orbs
 * that creates a premium, dynamic visual atmosphere.
 */

export default function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#07070e]">
      {/* Base gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#07070e] via-[#0c0c1d] to-[#07070e]" />
      
      {/* Animated orbs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-float-slow" />
      <div className="absolute top-[30%] right-[-15%] h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[100px] animate-float-medium" />
      <div className="absolute bottom-[-10%] left-[20%] h-[400px] w-[400px] rounded-full bg-cyan-500/6 blur-[100px] animate-float-fast" />
      <div className="absolute top-[60%] left-[50%] h-[300px] w-[300px] rounded-full bg-fuchsia-500/5 blur-[80px] animate-float-reverse" />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }} 
      />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
