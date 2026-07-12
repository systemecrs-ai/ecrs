'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfileDropdown() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push('/');
  };

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.05]" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="group relative flex h-9 items-center justify-center gap-2 overflow-hidden rounded-full bg-white/[0.05] px-4 border border-white/[0.08] transition-all hover:bg-white/[0.1] active:scale-95"
      >
        <span className="text-sm font-medium text-white/90">Log In</span>
      </Link>
    );
  }

  const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 transition-all hover:scale-105 hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <span className="text-sm font-medium text-indigo-300">{initial}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 p-2 shadow-2xl backdrop-blur-2xl"
          >
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <p className="text-xs text-white/50">Signed in as</p>
              <p className="truncate text-sm font-medium text-white mt-0.5">{user.email}</p>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ShieldAlert className="h-4 w-4" />
                Admin Dashboard
              </Link>
              <button
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              
              <div className="my-1 border-t border-white/[0.06]" />
              
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
