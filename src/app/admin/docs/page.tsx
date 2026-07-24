'use client';

/**
 * Admin Documents Page
 * 
 * Lists all files stored in the Supabase Storage `documents` bucket
 * with metadata (name, size, upload date, mime type).
 */

import { useState, useEffect } from 'react';
import { FileText, HardDrive, Calendar, FileType, Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';

interface StorageFile {
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  mimeType: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminDocumentsPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/documents');
        const data = await res.json();
        if (data.files) {
          setFiles(data.files);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch documents');
      } finally {
        setIsLoading(false);
      }
    }
    fetchFiles();
  }, []);

  return (
    <>
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">Documents</h1>
            <p className="mt-1 text-sm text-white/50">
              Files stored in your Supabase Storage bucket.
            </p>
          </div>

          {/* Stats Row */}
          {!isLoading && !error && (
            <div className="mb-6 flex gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-white">{files.length}</span> files
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                <HardDrive className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-white">
                    {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                  </span>{' '}
                  total
                </span>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-neutral-900/50 border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] bg-neutral-900/80">
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white/10" />
                          <div className="h-4 w-48 bg-white/10 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-white/10 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-white/10 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-white/10 rounded" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-rose-400/70">
                      {error}
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      No documents found in storage.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr
                      key={file.name}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 max-w-xs">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <FileText className="h-4 w-4 text-indigo-400" />
                          </div>
                          <span className="text-sm text-slate-200 truncate font-medium">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-1">
                          <FileType className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-400 uppercase">
                            {file.mimeType.split('/').pop() || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-400 tabular-nums">
                          {formatFileSize(file.size)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(file.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
