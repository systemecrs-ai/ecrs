/**
 * Inngest Client
 * 
 * Singleton Inngest client with type-safe event schemas.
 * Defines all background workflow events used in the platform:
 * - Document ingestion (parse → chunk → embed → store)
 * - Memory summarization (extract user traits from chat history)
 * 
 * @module infrastructure/queue/inngest-client
 */

import { Inngest } from 'inngest';

/**
 * Type-safe event schemas for all Inngest workflows.
 */
type InngestEvents = {
  'ingest/document.uploaded': {
    data: {
      jobId: string;
      blobUrl: string;
      filename: string;
      mimeType: string;
      fileSizeBytes: number;
    };
  };
  'memory/summarize.requested': {
    data: {
      sessionId: string;
      messageCount: number;
    };
  };
};

/**
 * Singleton Inngest client for the ECRS platform.
 * All Inngest functions and event dispatches use this instance.
 */
export const inngest = new Inngest({
  id: 'ecrs-rag-platform',
});

/**
 * Re-export the event type for use in worker functions.
 */
export type { InngestEvents };
