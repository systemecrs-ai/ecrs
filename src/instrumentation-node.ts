/**
 * Node.js Instrumentation Setup
 * 
 * Initializes OpenTelemetry SDK with Langfuse span processor
 * and registers the Vercel AI SDK v7 telemetry integration.
 * 
 * This file is conditionally imported by instrumentation.ts
 * only when NEXT_RUNTIME === 'nodejs' (never on Edge).
 * 
 * Graceful Degradation Strategy:
 * - If Langfuse credentials are missing → telemetry is silently disabled
 * - If initialization throws → error is logged, app continues normally
 * - The application NEVER crashes due to telemetry failures
 * 
 * @module instrumentation.node
 */

import { registerTelemetry } from 'ai';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Initializes the Langfuse + OpenTelemetry tracing pipeline.
 * 
 * Steps:
 * 1. Validates that Langfuse credentials are present
 * 2. Creates a NodeSDK with LangfuseSpanProcessor for span export
 * 3. Registers the Vercel AI SDK telemetry integration so that
 *    all streamText/generateText calls are automatically traced
 * 
 * The LangfuseSpanProcessor handles batching and flushing internally,
 * and registers process lifecycle hooks for graceful shutdown.
 */
function initializeLangfuse(): void {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

  // ── Guard: Skip initialization if credentials are not configured ────
  if (!secretKey || !publicKey) {
    console.warn(
      '[Langfuse] LANGFUSE_SECRET_KEY or LANGFUSE_PUBLIC_KEY not set. ' +
      'Telemetry is disabled. The app will continue to function normally.'
    );
    return;
  }

  try {
    // ── Step 1: Initialize OpenTelemetry SDK with Langfuse exporter ────
    // The LangfuseSpanProcessor batches spans and exports them to the
    // Langfuse API. It also registers process.on('beforeExit') and
    // process.on('SIGTERM') hooks to flush pending spans on shutdown.
    const sdk = new NodeSDK({
      spanProcessor: new LangfuseSpanProcessor({
        secretKey,
        publicKey,
        baseUrl,
      }),
    });
    sdk.start();

    // ── Step 2: Register Vercel AI SDK telemetry integration ──────────
    // This hooks into AI SDK v7's callback-based telemetry system.
    // All streamText(), generateText(), etc. calls will automatically
    // emit OTel spans with token usage, model info, and latency data.
    registerTelemetry(new LangfuseVercelAiSdkIntegration());

    console.info(
      '[Langfuse] OpenTelemetry initialized successfully. ' +
      `Exporting traces to ${baseUrl}`
    );
  } catch (error) {
    // ── Graceful degradation: telemetry failure must NEVER crash the app
    console.error(
      '[Langfuse] Failed to initialize telemetry. ' +
      'App will continue without tracing.',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Execute on import (called from instrumentation.ts register hook)
initializeLangfuse();
