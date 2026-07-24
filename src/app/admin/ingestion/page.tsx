'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Trash2, FileText, CheckCircle2, XCircle, Clock, ChevronRight, X } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';

interface IngestionJob {
  _id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: string;
  result?: {
    chunksProcessed: number;
    tokensEstimated: number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminIngestionPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/ingestion/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (error) {
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/admin/ingestion/cleanup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Cleanup successful: ${data.deletedJobsCount} jobs removed`, 'success');
        fetchJobs(); // Refresh the list
      } else {
        showToast(data.error || 'Cleanup failed', 'error');
      }
    } catch (error) {
      showToast('An error occurred during cleanup', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getStatusIcon = (status: IngestionJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'failed': return <XCircle className="w-5 h-5 text-rose-400" />;
      case 'processing': return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <>
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Ingestion Jobs</h1>
            <p className="text-slate-400">Monitor and manage document ingestion pipelines.</p>
          </div>
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.5)]"
          >
            {isCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clean Up Incomplete Jobs
          </button>
        </header>

        {/* Data Table */}
        <div className="bg-neutral-900/50 border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] bg-neutral-900/80">
                <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">File Name</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-5 w-5 bg-white/10 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-white/10 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-white/10 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-white/10 rounded" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-8 bg-white/10 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No ingestion jobs found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr 
                    key={job._id} 
                    onClick={() => setSelectedJob(job)}
                    className="group hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="capitalize text-sm font-medium text-slate-300">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-[200px] sm:max-w-xs">
                        <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-200 truncate">{job.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400 truncate block max-w-xs">
                        {job.progress || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-400">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <ChevronRight className="w-5 h-5 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Detail View Drawer */}
      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-neutral-900 border-l border-white/10 shadow-2xl z-50 overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-neutral-900/50 sticky top-0 backdrop-blur-md">
                <h2 className="text-lg font-semibold text-white">Job Details</h2>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex-1 space-y-6">
                <div>
                  <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2 tracking-wider">Status</h3>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedJob.status)}
                    <span className="capitalize text-slate-200 font-medium">{selectedJob.status}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2 tracking-wider">File Information</h3>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="text-slate-200 truncate ml-4">{selectedJob.filename}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">ID</span><span className="text-slate-200 truncate font-mono text-xs">{selectedJob._id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Created</span><span className="text-slate-200">{new Date(selectedJob.createdAt).toLocaleString()}</span></div>
                  </div>
                </div>
                
                {selectedJob.result && (
                  <div>
                    <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2 tracking-wider">Results</h3>
                    <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-indigo-300">Chunks Processed</span><span className="text-indigo-100 font-medium">{selectedJob.result.chunksProcessed}</span></div>
                      <div className="flex justify-between"><span className="text-indigo-300">Tokens Estimated</span><span className="text-indigo-100 font-medium">{selectedJob.result.tokensEstimated}</span></div>
                    </div>
                  </div>
                )}

                {selectedJob.error && (
                  <div>
                    <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2 tracking-wider">Error</h3>
                    <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 text-sm text-rose-200/90 whitespace-pre-wrap break-words">
                      {selectedJob.error}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2 tracking-wider">Raw Payload</h3>
                  <pre className="bg-black/50 rounded-xl p-4 border border-white/5 text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(selectedJob, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 text-sm font-medium border backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
