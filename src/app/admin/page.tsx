'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import FileUploadZone from '@/components/admin/FileUploadZone';
import RecentIngestions from '@/components/admin/RecentIngestions';

export default function AdminDashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-black selection:bg-indigo-500/30">
      {/* Background Decorators */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0a0a0a] to-black z-0"></div>

      <div className="relative z-10">
        <AdminSidebar />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-white/50">Manage your document ingestion pipeline and system health.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <FileUploadZone />
            </div>
            
            <div className="space-y-8">
              <RecentIngestions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
