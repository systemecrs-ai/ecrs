'use client';

/**
 * DocumentUploader (Async with Status Polling)
 * 
 * Production-grade drag-and-drop ingestion component with real-time
 * visual feedback for the async state machine:
 * Idle → Uploading → Queued → Processing → Indexed
 * 
 * Polls /api/ingest/status for background job progress.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import IngestionStepper from './IngestionStepper';

// ─── Types ──────────────────────────────────────────────────────────────────

type IngestionPhase = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

interface TrackedFile {
  filename: string;
  jobId?: string;
  phase: IngestionPhase;
  progress?: string;
  result?: { chunksProcessed: number; tokensEstimated: number };
  error?: string;
}

interface JobStatusResponse {
  jobId: string;
  filename: string;
  status: IngestionPhase;
  progress?: string;
  result?: { chunksProcessed: number; tokensEstimated: number };
  error?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DocumentUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Polling Logic ───────────────────────────────────────────────────────
  const pollJobStatuses = useCallback(async () => {
    const pendingFiles = trackedFiles.filter(
      f => f.jobId && (f.phase === 'queued' || f.phase === 'processing')
    );

    if (pendingFiles.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const jobIds = pendingFiles.map(f => f.jobId!).join(',');

    try {
      const response = await fetch(`/api/ingest/status?jobIds=${jobIds}`);
      if (!response.ok) return;

      const data = await response.json();
      const jobs: JobStatusResponse[] = data.jobs || [];

      setTrackedFiles(prev =>
        prev.map(file => {
          const updatedJob = jobs.find(j => j.jobId === file.jobId);
          if (!updatedJob) return file;

          return {
            ...file,
            phase: updatedJob.status,
            progress: updatedJob.progress,
            result: updatedJob.result,
            error: updatedJob.error,
          };
        })
      );
    } catch {
      // Silent failure — will retry on next poll
    }
  }, [trackedFiles]);

  // Start/stop polling when tracked files change
  useEffect(() => {
    const hasPending = trackedFiles.some(
      f => f.phase === 'queued' || f.phase === 'processing'
    );

    if (hasPending && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(pollJobStatuses, 2000);
    } else if (!hasPending && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [trackedFiles, pollJobStatuses]);

  // ── Upload Logic ────────────────────────────────────────────────────────
  const uploadFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;

    setGlobalError(null);

    // Initialize tracked files with 'uploading' phase
    const newFiles: TrackedFile[] = Array.from(files).map(f => ({
      filename: f.name,
      phase: 'uploading' as const,
      progress: 'Uploading to server',
    }));

    setTrackedFiles(prev => [...newFiles, ...prev]);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.status === 202 || response.ok) {
        // Update tracked files with job IDs and 'queued' status
        const jobMap = new Map<string, string>();
        (data.jobs || []).forEach((job: { jobId: string; filename: string }) => {
          jobMap.set(job.filename, job.jobId);
        });

        const errorMap = new Map<string, string>();
        (data.errors || []).forEach((err: { filename: string; error: string }) => {
          errorMap.set(err.filename, err.error);
        });

        setTrackedFiles(prev =>
          prev.map(file => {
            if (!newFiles.some(nf => nf.filename === file.filename && file.phase === 'uploading')) {
              return file;
            }

            const jobId = jobMap.get(file.filename);
            const error = errorMap.get(file.filename);

            if (jobId) {
              return { ...file, jobId, phase: 'queued', progress: 'Waiting in queue' };
            } else if (error) {
              return { ...file, phase: 'failed', error, progress: 'Failed' };
            }
            return file;
          })
        );
      } else {
        // All files failed
        setTrackedFiles(prev =>
          prev.map(file =>
            file.phase === 'uploading'
              ? { ...file, phase: 'failed', error: data.error || 'Upload failed', progress: 'Failed' }
              : file
          )
        );
        setGlobalError(data.error || 'Failed to upload documents.');
      }
    } catch {
      setTrackedFiles(prev =>
        prev.map(file =>
          file.phase === 'uploading'
            ? { ...file, phase: 'failed', error: 'Network error', progress: 'Failed' }
            : file
        )
      );
      setGlobalError('Network error occurred during upload.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ── Drag & Drop Handlers ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const clearCompleted = () => {
    setTrackedFiles(prev => prev.filter(f => f.phase !== 'completed' && f.phase !== 'failed'));
  };

  const isUploading = trackedFiles.some(f => f.phase === 'uploading');
  const hasResults = trackedFiles.length > 0;
  const hasTerminal = trackedFiles.some(f => f.phase === 'completed' || f.phase === 'failed');

  return (
    <div className="w-full max-w-3xl mx-auto" id="document-uploader">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-600/20 ring-1 ring-indigo-500/20">
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Knowledge Base</h2>
            <p className="text-xs text-white/40">Upload documents to expand AI knowledge</p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-300 ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        id="drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          multiple
          accept=".pdf,.txt,application/pdf,text/plain"
          id="file-input"
        />

        <div className="flex flex-col items-center text-center">
          {isUploading ? (
            <div className="flex flex-col items-center text-indigo-400">
              <svg className="h-8 w-8 animate-spin mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm font-medium">Uploading files...</p>
            </div>
          ) : (
            <>
              <div className="mb-3 rounded-full bg-white/[0.04] p-3 text-white/30 ring-1 ring-white/[0.06]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <p className="mb-1 text-sm font-medium text-white/80">
                Drop files here or browse
              </p>
              <p className="mb-4 text-xs text-white/35">
                PDF & TXT • Max 10MB per file
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-xs font-medium text-white transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.97]"
                id="browse-files-button"
              >
                Browse Files
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tracked Files List */}
      {hasResults && (
        <div className="mt-4 space-y-3">
          {/* Clear button */}
          {hasTerminal && (
            <div className="flex justify-end">
              <button
                onClick={clearCompleted}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                id="clear-completed-button"
              >
                Clear completed
              </button>
            </div>
          )}

          {trackedFiles.map((file, idx) => (
            <div
              key={`${file.filename}-${idx}`}
              className={`rounded-xl border p-4 transition-all duration-300 animate-slide-up ${
                file.phase === 'failed'
                  ? 'border-red-500/20 bg-red-500/[0.04]'
                  : file.phase === 'completed'
                  ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              {/* File header */}
              <div className="flex items-center gap-3 mb-3">
                {/* File icon */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  file.phase === 'failed'
                    ? 'bg-red-500/10 text-red-400'
                    : file.phase === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-white/[0.04] text-white/40'
                }`}>
                  {file.filename.endsWith('.pdf') ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>

                {/* Filename and result */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {file.filename}
                  </p>
                  {file.result && (
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">
                      {file.result.chunksProcessed} chunks • ~{Math.round(file.result.tokensEstimated)} tokens
                    </p>
                  )}
                  {file.error && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">
                      {file.error}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  file.phase === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                    : file.phase === 'failed'
                    ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
                }`}>
                  {file.phase === 'completed' ? 'Indexed' :
                   file.phase === 'failed' ? 'Failed' :
                   file.phase === 'uploading' ? 'Uploading' :
                   file.phase === 'queued' ? 'Queued' :
                   file.phase === 'processing' ? 'Processing' : 'Idle'}
                </div>
              </div>

              {/* Stepper (shown for active/completed files) */}
              {file.phase !== 'idle' && (
                <IngestionStepper phase={file.phase} progress={file.progress} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-400">
          {globalError}
        </div>
      )}
    </div>
  );
}
