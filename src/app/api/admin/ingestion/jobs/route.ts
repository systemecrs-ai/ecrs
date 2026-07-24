import { NextResponse } from 'next/server';
import { getAllJobs } from '@/infrastructure/database/job-repository';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminIngestionJobsAPI');

/**
 * GET /api/admin/ingestion/jobs
 * Fetches all ingestion jobs for the admin dashboard.
 */
export async function GET(req: Request) {
  try {
    const jobs = await getAllJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch jobs', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
