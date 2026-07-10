/**
 * Job Repository
 * 
 * Data access layer for the ingestion_jobs collection.
 * Provides CRUD operations for tracking the lifecycle of
 * asynchronous document ingestion pipelines.
 * 
 * @module infrastructure/database/job-repository
 */

import { getDatabase } from './mongodb-client';
import { IngestionJob, IngestionJobStatus } from '@/infrastructure/queue/types';
import { INGESTION_JOBS_COLLECTION } from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';

const log = createLogger('JobRepository');

/**
 * Creates a new ingestion job record in the database.
 * 
 * @param job - The job document to insert
 * @throws {DatabaseError} If the insert operation fails
 */
export async function createJob(job: IngestionJob): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<IngestionJob>(INGESTION_JOBS_COLLECTION);
    
    log.info('Creating ingestion job', { jobId: job._id, filename: job.filename });
    await collection.insertOne(job);
    log.debug('Ingestion job created', { jobId: job._id });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to create ingestion job', { error: err.message });
    throw new DatabaseError(`Failed to create ingestion job: ${err.message}`, err);
  }
}

/**
 * Updates the status and optional fields of an existing job.
 * 
 * @param jobId - The job ID to update
 * @param status - New status value
 * @param update - Additional fields to update (progress, result, error)
 */
export async function updateJobStatus(
  jobId: string,
  status: IngestionJobStatus,
  update: Partial<Pick<IngestionJob, 'progress' | 'result' | 'error'>> = {}
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<IngestionJob>(INGESTION_JOBS_COLLECTION);

    log.info('Updating job status', { jobId, status, progress: update.progress });

    await collection.updateOne(
      { _id: jobId },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...update,
        },
      }
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to update job status', { jobId, error: err.message });
    throw new DatabaseError(`Failed to update job status: ${err.message}`, err);
  }
}

/**
 * Retrieves a single job by its ID.
 * 
 * @param jobId - The job ID to look up
 * @returns The job document or null if not found
 */
export async function getJobById(jobId: string): Promise<IngestionJob | null> {
  try {
    const db = await getDatabase();
    const collection = db.collection<IngestionJob>(INGESTION_JOBS_COLLECTION);
    return await collection.findOne({ _id: jobId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch job', { jobId, error: err.message });
    throw new DatabaseError(`Failed to fetch job: ${err.message}`, err);
  }
}

/**
 * Retrieves multiple jobs by their IDs.
 * Used by the frontend status polling endpoint.
 * 
 * @param jobIds - Array of job IDs to look up
 * @returns Array of matching job documents
 */
export async function getJobsByIds(jobIds: string[]): Promise<IngestionJob[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<IngestionJob>(INGESTION_JOBS_COLLECTION);
    return await collection.find({ _id: { $in: jobIds } }).toArray();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch jobs', { count: jobIds.length, error: err.message });
    throw new DatabaseError(`Failed to fetch jobs: ${err.message}`, err);
  }
}
