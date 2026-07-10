/**
 * Ingestion Status API Route
 * 
 * GET /api/ingest/status?jobIds=id1,id2,id3
 * 
 * Returns the current status of one or more ingestion jobs.
 * Used by the frontend to poll async ingestion progress.
 * 
 * @module app/api/ingest/status/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobsByIds } from '@/infrastructure/database/job-repository';
import { IngestionJobStatusResponse } from '@/infrastructure/queue/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('IngestStatusRoute');

/**
 * Handles GET requests to /api/ingest/status.
 * Query param: jobIds (comma-separated list of job IDs)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobIdsParam = searchParams.get('jobIds');

    if (!jobIdsParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: jobIds' },
        { status: 400 }
      );
    }

    const jobIds = jobIdsParam.split(',').map(id => id.trim()).filter(Boolean);

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds parameter must contain at least one ID' },
        { status: 400 }
      );
    }

    if (jobIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximum of 20 job IDs per request' },
        { status: 400 }
      );
    }

    log.debug('Fetching job statuses', { count: jobIds.length });
    const jobs = await getJobsByIds(jobIds);

    const response: IngestionJobStatusResponse[] = jobs.map(job => ({
      jobId: job._id,
      filename: job.filename,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
    }));

    return NextResponse.json({ jobs: response });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch job statuses', { error: err.message });

    return NextResponse.json(
      { error: 'Failed to retrieve job statuses.' },
      { status: 500 }
    );
  }
}
