import React from 'react';
import Link from 'next/link';
import { Cpu, ArrowLeft, Wrench } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-sky-400">
        <Cpu className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-100">
        Halaman atau Rakitan Tidak Ditemukan
      </h1>
      <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
        Tautan rakitan PC yang Anda cari mungkin salah ketik atau belum disimpan ke dalam database
        publik RakitPC.id.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
        <Link
          href="/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>Buka Workspace Simulasi</span>
        </Link>
      </div>
    </div>
  );
}
