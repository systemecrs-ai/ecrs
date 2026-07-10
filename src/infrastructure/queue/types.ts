/**
 * Queue & Job Types
 * 
 * Type definitions for ingestion job tracking and queue payloads.
 * These types define the schema for the `ingestion_jobs` MongoDB collection
 * and the shape of job status responses returned to the frontend.
 * 
 * @module infrastructure/queue/types
 */

/**
 * Possible states of an ingestion job.
 * Transitions: queued → processing → completed | failed
 */
export type IngestionJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * MongoDB document schema for the ingestion_jobs collection.
 * Tracks the lifecycle of an async document ingestion pipeline.
 */
export interface IngestionJob {
  /** Unique job identifier (also serves as MongoDB _id) */
  _id: string;
  /** Original filename of the uploaded document */
  filename: string;
  /** Current processing status */
  status: IngestionJobStatus;
  /** Vercel Blob URL where the file is temporarily stored */
  blobUrl: string;
  /** Human-readable description of the current processing stage */
  progress?: string;
  /** Result data, populated on successful completion */
  result?: {
    chunksProcessed: number;
    tokensEstimated: number;
  };
  /** Error message, populated on failure */
  error?: string;
  /** Job creation timestamp */
  createdAt: Date;
  /** Last status update timestamp */
  updatedAt: Date;
}

/**
 * Subset of IngestionJob returned to the frontend for status polling.
 */
export interface IngestionJobStatusResponse {
  jobId: string;
  filename: string;
  status: IngestionJobStatus;
  progress?: string;
  result?: {
    chunksProcessed: number;
    tokensEstimated: number;
  };
  error?: string;
}
