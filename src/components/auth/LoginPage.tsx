'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';


export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // If email confirmation is required, this will handle it gracefully.
        setError('Check your email for the confirmation link.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black selection:bg-indigo-500/30">
      {/* Background Decorators */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-black"></div>
      
      {/* Decorative blurred spheres */}
      <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]"></div>
      <div className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]"></div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Brand */}
        <div className="mb-10 flex flex-col items-center">
          <Link href="/" className="group flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <Image
              src="/logo.jpg"
              alt="CartContext Logo"
              width={56}
              height={56}
              className="object-contain"
            />
          </Link>
          <h1 className="mt-6 text-3xl">
            <span className="font-semibold text-white tracking-tight">cart</span>
            <span className="font-light text-slate-300 tracking-tight">context</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">Your intelligent shopping assistant</p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 py-3.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* ----- GOOGLE OAUTH SECTION ----- */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>
          
          <GoogleAuthButton />
          {/* -------------------------------- */}

          <div className="mt-8 text-center text-sm text-white/50">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
