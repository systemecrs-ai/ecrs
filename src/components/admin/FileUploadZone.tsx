'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, CheckCircle2, Loader2 } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file.type !== 'application/pdf') {
      setUploadState('error');
      setErrorMessage('Only PDF files are supported.');
      return;
    }

    // Mock upload and processing sequence
    setUploadState('uploading');
    setTimeout(() => {
      setUploadState('processing');
      setTimeout(() => {
        setUploadState('success');
        setTimeout(() => {
          setUploadState('idle');
        }, 3000);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-6 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">Document Ingestion</h3>
      
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
          accept=".pdf"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          disabled={uploadState === 'uploading' || uploadState === 'processing'}
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
              <p className="text-sm font-medium text-white/90">
                Drag & drop your PDF manual here
              </p>
              <p className="mt-1 text-xs text-white/40">
                or click to browse files
              </p>
            </motion.div>
          )}

          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="mt-4 text-sm font-medium text-white/90">Uploading...</p>
            </motion.div>
          )}

          {uploadState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <File className="h-8 w-8 text-indigo-400 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-indigo-500 animate-ping" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-white/90">Processing...</p>
              <p className="mt-1 text-xs text-white/50">Chunking & embedding document</p>
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
              <p className="text-sm font-medium text-white/90">Ingestion Complete!</p>
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
                <UploadCloud className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-sm font-medium text-white/90">Upload Failed</p>
              <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadState('idle');
                }}
                className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 z-10 relative"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
