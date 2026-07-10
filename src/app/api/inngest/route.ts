/**
 * Inngest Serve Endpoint
 * 
 * POST/GET /api/inngest — The Inngest webhook endpoint that
 * registers and serves all background workflow functions.
 * 
 * Inngest calls this endpoint to discover functions and
 * dispatch step executions. Must be accessible at /api/inngest.
 * 
 * @module app/api/inngest/route
 */

import { serve } from 'inngest/next';
import { inngest } from '@/infrastructure/queue/inngest-client';
import { documentIngestionFunction } from '@/core/workers/ingestion-worker';
import { memorySummarizeFunction } from '@/core/workers/memory-worker';

/**
 * Inngest serve handler — registers all workflow functions
 * and creates the GET/POST/PUT handlers for the Inngest protocol.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    documentIngestionFunction,
    memorySummarizeFunction,
  ],
});
