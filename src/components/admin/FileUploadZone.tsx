'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, CheckCircle2, Loader2, AlertCircle, Cpu } from 'lucide-react';

/**
 * Updated states to include the crucial background processing step:
 * idle → presigning → uploading → dispatching → processing (polling DB) → success → idle
 */
type UploadState = 'idle' | 'presigning' | 'uploading' | 'dispatching' | 'processing' | 'success' | 'error';

const ALLOWED_TYPES = ['application/pdf', 'text/plain'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // Bumped to 15MB to support heavy test docs

export default function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [backendProgressMessage, setBackendProgressMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const abortRef = useRef<XMLHttpRequest | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  /**
   * Tracks long-running background workers by polling the MongoDB Job Repository status
   * Updated to match the batch API route: /api/ingest/status?jobIds=...
   */
  const startStatusPolling = (jobId: string) => {
    setUploadState('processing');
    setBackendProgressMessage('Job initialized in background...');

    pollingIntervalRef.current = setInterval(async () => {
      try {
        // MATCH #1: Send 'jobIds' (plural) in the query string
        const res = await fetch(`/api/ingest/status?jobIds=${jobId}`);
        
        if (!res.ok) return;

        const data = await res.json();
        
        // MATCH #2: Extract the specific job from the returned 'jobs' array
        const job = data.jobs?.[0];
        
        if (!job) return; // Wait for the next poll if database hasn't synced yet

        if (job.status === 'processing') {
          // Dynamically update the UI text
          setBackendProgressMessage(job.progress || 'Processing document...');
        } else if (job.status === 'completed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setUploadState('success');
          
          setTimeout(() => {
            setUploadState('idle');
            setFileName('');
            setBackendProgressMessage('');
          }, 4000);
        } else if (job.status === 'failed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setUploadState('error');
          setErrorMessage(job.error || 'The background ingestion worker failed.');
        }
      } catch (err) {
        // Suppress transient polling glitches, keep trying
        console.error('Polling error:', err);
      }
    }, 2500); // Polls every 2.5 seconds
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadState('error');
      setErrorMessage('Only PDF and TXT files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadState('error');
      setErrorMessage(`File size exceeds 15MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }

    setFileName(file.name);
    setUploadProgress(0);

    try {
      // ── Phase 1: Request upload ticket ────────────────────────────
      setUploadState('presigning');
      const presignRes = await fetch('/api/ingest/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error || `Presign configuration failed: ${presignRes.status}`);
      }

      const { signedUrl, blobPath } = await presignRes.json();

      // ── Phase 2: Upload directly to Supabase ──────────────────────
      setUploadState('uploading');
      await uploadToStorage(signedUrl, file);

      // ── Phase 3: Trigger background orchestration ─────────────────
      setUploadState('dispatching');
      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobPath,
          filename: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        }),
      });

      if (!ingestRes.ok) {
        const data = await ingestRes.json().catch(() => ({}));
        throw new Error(data.error || `Ingestion engine failed to initialize: ${ingestRes.status}`);
      }

      const { jobId } = await ingestRes.json();
      
      // Kickoff real-time job state checking
      startStatusPolling(jobId);

    } catch (error) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setUploadState('error');
      setErrorMessage(message);
    }
  };

  const uploadToStorage = (signedUrl: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      abortRef.current = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        abortRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage transmission aborted: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        abortRef.current = null;
        reject(new Error('Network connectivity issue disrupted upload.'));
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const isWorking = ['presigning', 'uploading', 'dispatching', 'processing'].includes(uploadState);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-6 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">Document Ingestion Panel</h3>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
            : uploadState === 'error'
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-white/10 bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/[0.04]'
        }`}
      >
        <input 
          type="file" 
          accept=".pdf,.txt"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          disabled={isWorking}
        />

        <AnimatePresence mode="wait">
          {uploadState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                <UploadCloud className={`h-7 w-7 ${isDragging ? 'text-indigo-400' : 'text-white/40'}`} />
              </div>
              <p className="text-sm font-medium text-white/90 font-sans">
                Drag & drop store manual or report here
              </p>
              <p className="mt-1 text-xs text-white/40">
                or click to search system files (max 15MB)
              </p>
            </motion.div>
          )}

          {uploadState === 'presigning' && (
            <motion.div
              key="presigning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="mt-4 text-sm font-medium text-white/90">Generating cloud storage access ticket...</p>
              <p className="mt-1 text-xs text-white/50 truncate max-w-[240px]">{fileName}</p>
            </motion.div>
          )}

          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex w-full max-w-xs flex-col items-center"
            >
              <div className="relative">
                <File className="h-8 w-8 text-indigo-400 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-indigo-500 animate-ping" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-white/90">
                Uploading directly to bucket... {uploadProgress}%
              </p>
              <p className="mt-1 text-xs text-white/50 truncate max-w-[240px]">{fileName}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {uploadState === 'dispatching' && (
            <motion.div
              key="dispatching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <p className="mt-4 text-sm font-medium text-white/90">Assembling Inngest background event worker...</p>
            </motion.div>
          )}

          {/* NEW LIVE TRACKING CONTAINER */}
          {uploadState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center px-4"
            >
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                <Cpu className="h-7 w-7 text-amber-400 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-white">Durable Ingestion Engine Running</p>
              <div className="mt-2 rounded-lg bg-white/[0.03] border border-white/5 px-4 py-2 text-xs font-mono text-amber-300 max-w-[280px]">
                {backendProgressMessage}
              </div>
              <p className="mt-3 text-[11px] text-white/30 italic animate-bounce">
                Safe to browse away — execution clock is self-managed.
              </p>
            </motion.div>
          )}

          {uploadState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white/90">Knowledge Base Synthesized!</p>
              <p className="mt-1 text-xs text-white/50">Vector paths completely indexed in MongoDB.</p>
            </motion.div>
          )}

          {uploadState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-sm font-medium text-white/90">Pipeline Disruption</p>
              <p className="mt-1 max-w-[260px] text-center text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/30 p-2 rounded-md">
                {errorMessage}
              </p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadState('idle');
                  setErrorMessage('');
                  setFileName('');
                  setBackendProgressMessage('');
                }}
                className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 z-10 relative"
              >
                Reset Drop Zone
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}