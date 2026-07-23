/**
 * Presigned Upload URL API Route
 * 
 * POST /api/ingest/presign — Generates a presigned URL for direct
 * browser-to-Supabase-Storage file uploads. The frontend uses this URL
 * to upload files without routing them through the Next.js serverless function.
 * 
 * Flow:
 * 1. Frontend requests a presigned URL with file metadata
 * 2. This route validates the request and generates the URL
 * 3. Frontend uploads directly to Supabase Storage
 * 4. Frontend then sends only metadata to /api/ingest
 * 
 * @module app/api/ingest/presign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl } from '@/infrastructure/storage/supabase-admin';
import { AppError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const log = createLogger('PresignRoute');

/** Maximum file size (20MB) */
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Allowed MIME types for document ingestion */
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];

/**
 * Handles POST requests to /api/ingest/presign.
 * Expects JSON body: { filename, mimeType, fileSizeBytes }
 * 
 * Returns 200 with { signedUrl, token, blobPath } on success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, mimeType, fileSizeBytes } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!filename || typeof filename !== 'string') {
      throw new ValidationError('Missing or invalid "filename" field.');
    }

    if (!mimeType || typeof mimeType !== 'string') {
      throw new ValidationError('Missing or invalid "mimeType" field.');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Unsupported file type: ${mimeType}. Only PDF and TXT are allowed.`
      );
    }

    if (typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
      throw new ValidationError('Missing or invalid "fileSizeBytes" field.');
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds the 10MB limit (${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB).`
      );
    }

    // ── Generate Presigned URL ────────────────────────────────────────────
    const fileId = randomUUID();
    const blobPath = `ingest/${fileId}/${filename}`;

    log.info('Generating presigned upload URL', { filename, blobPath, fileSizeBytes });

    const { signedUrl, token } = await createPresignedUploadUrl(blobPath);

    log.info('Presigned URL generated', { blobPath });

    return NextResponse.json({
      signedUrl,
      token,
      blobPath,
    });
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
  log.error('Unexpected error in presign route', { error: err.message, stack: err.stack });

  return NextResponse.json(
    { error: 'An internal server error occurred.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
