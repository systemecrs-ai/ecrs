'use client';

/**
 * IngestionStepper
 * 
 * Visual progress stepper showing the 4-phase async ingestion pipeline.
 * Displays: Upload → Queue → Process → Index with animated transitions
 * between active, completed, and pending states.
 */

interface IngestionStepperProps {
  phase: 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  progress?: string;
}

const STEPS = [
  { key: 'uploading', label: 'Upload', icon: '↑' },
  { key: 'queued', label: 'Queue', icon: '⏳' },
  { key: 'processing', label: 'Process', icon: '⚙' },
  { key: 'completed', label: 'Index', icon: '✓' },
] as const;

const STEP_ORDER = { idle: -1, uploading: 0, queued: 1, processing: 2, completed: 3, failed: -2 };

export default function IngestionStepper({ phase, progress }: IngestionStepperProps) {
  const currentIndex = STEP_ORDER[phase];
  const isFailed = phase === 'failed';

  return (
    <div className="w-full">
      {/* Steps */}
      <div className="flex items-center justify-between relative">
        {/* Progress bar background */}
        <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-white/[0.06] mx-6" />
        
        {/* Animated progress fill */}
        <div
          className="absolute left-0 top-[14px] h-[2px] mx-6 transition-all duration-700 ease-out"
          style={{
            width: isFailed
              ? '0%'
              : `${Math.max(0, Math.min(100, ((currentIndex) / (STEPS.length - 1)) * 100))}%`,
            background: isFailed
              ? 'rgb(239, 68, 68)'
              : 'linear-gradient(90deg, rgb(99, 102, 241), rgb(139, 92, 246))',
          }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = !isFailed && currentIndex > index;
          const isActive = !isFailed && currentIndex === index;
          const isPending = isFailed || currentIndex < index;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              {/* Step circle */}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-100'
                    : isActive
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-110 animate-pulse'
                    : isFailed && index === 0
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                    : 'bg-white/[0.04] text-white/30 ring-1 ring-white/[0.08]'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isFailed ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-1.5 text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                  isCompleted || isActive
                    ? 'text-indigo-300'
                    : isFailed
                    ? 'text-red-400/60'
                    : 'text-white/25'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress description */}
      {progress && (
        <p className={`mt-3 text-center text-xs animate-fade-in ${
          isFailed ? 'text-red-400/70' : 'text-white/40'
        }`}>
          {progress}
        </p>
      )}
    </div>
  );
}
