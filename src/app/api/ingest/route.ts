/**
 * Document Ingestion API Route (Async — Metadata Only)
 * 
 * POST /api/ingest — Accepts file metadata (after direct-to-storage upload),
 * creates a job record, dispatches to Inngest for background processing,
 * and immediately returns 202 Accepted with the job ID.
 * 
 * This route NEVER receives file bytes. Files are already in Supabase Storage
 * via presigned URL upload. This route only receives the resulting blobPath
 * and metadata, making it extremely fast and lightweight.
 * 
 * @module app/api/ingest/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/infrastructure/queue/inngest-client';
import { createJob } from '@/infrastructure/database/job-repository';
import { IngestionJob } from '@/infrastructure/queue/types';
import { ValidationError, AppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const log = createLogger('IngestRoute');

/**
 * Handles POST requests to /api/ingest.
 * Expects a JSON body with file metadata after a successful direct-to-storage upload:
 * { blobPath, filename, mimeType, fileSizeBytes }
 * 
 * Returns 202 Accepted with the jobId for status polling.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blobPath, filename, mimeType, fileSizeBytes } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!blobPath || typeof blobPath !== 'string') {
      throw new ValidationError('Missing or invalid "blobPath" field.');
    }

    if (!filename || typeof filename !== 'string') {
      throw new ValidationError('Missing or invalid "filename" field.');
    }

    if (!mimeType || typeof mimeType !== 'string') {
      throw new ValidationError('Missing or invalid "mimeType" field.');
    }

    if (typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
      throw new ValidationError('Missing or invalid "fileSizeBytes" field.');
    }

    const jobId = randomUUID();

    log.info('Creating ingestion job', { jobId, filename, blobPath });

    // ── Stage 1: Create job record ────────────────────────────────────
    const now = new Date();
    const job: IngestionJob = {
      _id: jobId,
      filename,
      status: 'queued',
      blobUrl: blobPath, // Stored as blobUrl in the DB schema for backwards compat
      progress: 'Waiting in queue',
      createdAt: now,
      updatedAt: now,
    };
    await createJob(job);

    // ── Stage 2: Dispatch to Inngest ──────────────────────────────────
    await inngest.send({
      name: 'ingest/document.uploaded',
      data: {
        jobId,
        blobPath,
        filename,
        mimeType,
        fileSizeBytes,
      },
    });

    log.info('Ingestion job queued', { jobId, filename });

    return NextResponse.json(
      {
        message: 'File accepted for processing',
        jobId,
        filename,
      },
      { status: 202 }
    );
  } catch (error) {
    return handleError(error);
  }
}

// ─── Error Handler ──────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    log.error(`${error.name}: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
    });

    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  const err = error instanceof Error ? error : new Error(String(error));
  log.error('Unexpected error in ingest route', { error: err.message, stack: err.stack });

  return NextResponse.json(
    { error: 'An internal server error occurred during ingestion.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
