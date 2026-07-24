import { NextResponse } from 'next/server';
import { getIncompleteJobs, deleteJobs } from '@/infrastructure/database/job-repository';
import { deleteDocumentsByFilenames } from '@/infrastructure/database/document-repository';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminIngestionCleanupAPI');

/**
 * POST /api/admin/ingestion/cleanup
 * Finds all incomplete ingestion jobs and deletes them from the jobs collection.
 * Also deletes any ghost document chunks from the unified nodes collection 
 * that are associated with the incomplete jobs' filenames.
 */
export async function POST(req: Request) {
  try {
    const incompleteJobs = await getIncompleteJobs();
    
    if (!incompleteJobs || incompleteJobs.length === 0) {
      return NextResponse.json({ message: 'No incomplete jobs to clean up.', deletedJobsCount: 0 });
    }

    const jobIds = incompleteJobs.map(job => job._id);
    const filenames = incompleteJobs.map(job => job.filename);

    log.info('Starting cleanup of incomplete jobs', { count: jobIds.length });

    // Execute deletions concurrently
    await Promise.all([
      deleteJobs(jobIds),
      deleteDocumentsByFilenames(filenames)
    ]);

    log.info('Cleanup completed successfully', { deletedJobsCount: jobIds.length });

    return NextResponse.json({ 
      message: 'Cleanup successful', 
      deletedJobsCount: jobIds.length,
      deletedFilenames: filenames
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to cleanup jobs', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to clean up incomplete jobs' },
      { status: 500 }
    );
  }
}
