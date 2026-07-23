/**
 * Next.js Instrumentation Hook
 * 
 * Called once when a new Next.js server instance is initiated.
 * Initializes OpenTelemetry with Langfuse span processing for
 * zero-cost observability of the RAG pipeline.
 * 
 * This file MUST live in the `src/` directory (or project root)
 * per Next.js convention. It runs before any request is handled.
 * 
 * @see https://nextjs.org/docs/app/guides/instrumentation
 * @module instrumentation
 */

export async function register() {
  // OTel NodeSDK is not compatible with Edge runtime.
  // Only initialize telemetry in the Node.js server environment.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
