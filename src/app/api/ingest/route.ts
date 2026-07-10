/**
 * Document Ingestion API Route (Async)
 * 
 * POST /api/ingest — Accepts file uploads, stores them in Vercel Blob,
 * creates a job record, dispatches to Inngest for background processing,
 * and immediately returns 202 Accepted with job IDs.
 * 
 * This route NEVER performs heavy parsing or embedding inline.
 * All CPU/IO-intensive work is offloaded to the Inngest worker.
 * 
 * @module app/api/ingest/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { inngest } from '@/infrastructure/queue/inngest-client';
import { createJob } from '@/infrastructure/database/job-repository';
import { IngestionJob } from '@/infrastructure/queue/types';
import { ValidationError, AppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const log = createLogger('IngestRoute');

// Maximum file size (10MB — increased for multimodal PDFs)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];

/**
 * Handles POST requests to /api/ingest.
 * Expects a FormData object containing one or more files under the 'files' key.
 * 
 * Returns 202 Accepted with an array of jobIds for status polling.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      throw new ValidationError('No files provided in the request.');
    }

    log.info('Received files for async ingestion', { count: files.length });

    const jobs: { jobId: string; filename: string }[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push({ filename: 'Unknown', error: 'Invalid file object' });
        continue;
      }

      const filename = file.name;
      const mimeType = file.type || 'application/octet-stream';

      // ── Validation ──────────────────────────────────────────────────────
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        errors.push({
          filename,
          error: `Unsupported file type: ${mimeType}. Only PDF and TXT are allowed.`,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          filename,
          error: `File size exceeds the 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`,
        });
        continue;
      }

      try {
        const jobId = randomUUID();

        // ── Stage 1: Upload to Vercel Blob ──────────────────────────────
        log.info('Uploading file to blob storage', { filename, jobId });
        const blob = await put(`ingest/${jobId}/${filename}`, file, {
          access: 'public',
          addRandomSuffix: false,
        });

        // ── Stage 2: Create job record ──────────────────────────────────
        const now = new Date();
        const job: IngestionJob = {
          _id: jobId,
          filename,
          status: 'queued',
          blobUrl: blob.url,
          progress: 'Waiting in queue',
          createdAt: now,
          updatedAt: now,
        };
        await createJob(job);

        // ── Stage 3: Dispatch to Inngest ────────────────────────────────
        await inngest.send({
          name: 'ingest/document.uploaded',
          data: {
            jobId,
            blobUrl: blob.url,
            filename,
            mimeType,
            fileSizeBytes: file.size,
          },
        });

        log.info('Ingestion job queued', { jobId, filename });
        jobs.push({ jobId, filename });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(`Failed to queue file ${filename}`, { error: err.message });
        errors.push({ filename, error: err.message });
      }
    }

    // If all files failed validation/queuing, return error
    if (jobs.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'All file uploads failed.', details: errors },
        { status: 422 }
      );
    }

    // Return 202 Accepted with job IDs for status polling
    return NextResponse.json(
      {
        message: 'Files accepted for processing',
        jobs,
        errors: errors.length > 0 ? errors : undefined,
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
