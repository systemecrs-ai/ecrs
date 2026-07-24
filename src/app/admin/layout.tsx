import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Admin Layout
 * 
 * Server Component wrapper for all /admin/* routes.
 * Enforces authentication and admin-role authorization
 * before rendering any admin content. Also provides the
 * shared admin shell (background + sidebar + content area).
 * 
 * @module app/admin/layout
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Server-side auth guard ─────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Check admin allowlist
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email?.toLowerCase() ?? '')) {
    redirect('/');
  }

  // ── Shared admin shell ────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-black selection:bg-indigo-500/30">
      {/* Background Decorators */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0a0a0a] to-black z-0" />

      {/* Content — children render the active tab's page */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
