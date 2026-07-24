'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import FileUploadZone from '@/components/admin/FileUploadZone';
import RecentIngestions from '@/components/admin/RecentIngestions';

/**
 * Admin Dashboard Page (Default Tab)
 * 
 * Renders the FileUploadZone and RecentIngestions components.
 * The shared admin shell (background + auth guard) is provided
 * by the parent layout.tsx.
 */
export default function AdminDashboardPage() {
  return (
    <>
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto">
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
    </>
  );
}
