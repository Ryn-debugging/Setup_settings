'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@rakitpc.id');
  const [password, setPassword] = useState('rakitpc-admin-2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured()) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!authErr) {
          localStorage.setItem(
            'rakitpc_admin_session',
            JSON.stringify({ email, role: 'admin', loginAt: new Date().toISOString() })
          );
          router.push('/admin/dashboard');
          return;
        }
      }

      // Check local curator credentials
      if (
        email.trim().toLowerCase() === 'admin@rakitpc.id' &&
        password === 'rakitpc-admin-2026'
      ) {
        localStorage.setItem(
          'rakitpc_admin_session',
          JSON.stringify({ email, role: 'admin', loginAt: new Date().toISOString() })
        );
        router.push('/admin/dashboard');
      } else {
        setError(
          'Email atau kata sandi Admin tidak valid. Gunakan akun kurator: admin@rakitpc.id / rakitpc-admin-2026'
        );
      }
    } catch {
      setError('Gagal melakukan autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[78vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-800 bg-[#0F1623] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 border border-slate-700 text-sky-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Portal Kurator Data
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100">
              Login Admin RakitPC.id
            </h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Halaman terproteksi untuk mengelola katalog komponen perangkat keras, Bulk Import CSV,
          dan pembaruan harga pasar massal.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="admin-email-input"
              className="block text-xs font-semibold text-slate-300"
            >
              Email Kurator / Admin
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="admin-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="admin@rakitpc.id"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-semibold text-slate-300"
            >
              Kata Sandi
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            id="admin-login-submit-btn"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors"
          >
            <span>{loading ? 'Memverifikasi Akses...' : 'Masuk ke Dashboard Admin'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
              <KeyRound className="h-3.5 w-3.5 text-sky-400" />
              <span>Kredensial Kurator Default</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@rakitpc.id');
                setPassword('rakitpc-admin-2026');
              }}
              className="text-[11px] font-semibold text-sky-400 hover:underline"
            >
              Isi Otomatis
            </button>
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-slate-400">
            Email: <span className="text-slate-200">admin@rakitpc.id</span>
            <br />
            Sandi: <span className="text-slate-200">rakitpc-admin-2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
