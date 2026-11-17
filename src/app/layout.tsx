import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { Cpu } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'RakitPC.id — Platform Simulasi, Validasi Kompatibilitas & Perencanaan Rakit PC',
    template: '%s | RakitPC.id',
  },
  description:
    'Simulasikan rakitan PC kustom sesuai anggaran dengan validasi kompatibilitas otomatis (Socket CPU, DDR RAM, Dimensi GPU/Casing, Daya PSU), kalkulator bottleneck 1080p/1440p/4K, rekomendasi otomatis, dan ekspor spesifikasi ke PNG/PDF.',
  keywords: [
    'rakit pc',
    'simulasi rakit pc',
    'pc builder indonesia',
    'kalkulator bottleneck',
    'cek kompatibilitas pc',
    'estimasi psu watt',
    'rakitpc.id',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 selection:bg-sky-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800/90 bg-[#080B11] py-10 text-xs text-slate-400">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 border border-slate-800 text-sky-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-200">RakitPC.id</span>
                  <p className="text-[11px] text-slate-500">
                    Platform Simulasi & Perencanaan Kustomisasi PC Indonesia (Tanpa Transaksi
                    E-Commerce)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-400">
                <Link href="/" className="hover:text-sky-400 transition-colors">
                  Beranda
                </Link>
                <Link href="/builder" className="hover:text-sky-400 transition-colors">
                  Workspace Simulasi
                </Link>
                <Link href="/catalog" className="hover:text-sky-400 transition-colors">
                  Katalog Komponen
                </Link>
                <Link href="/build/qhd-1440p-am5-pro" className="hover:text-sky-400 transition-colors">
                  Contoh Rakitan Publik
                </Link>
                <Link href="/admin/dashboard" className="hover:text-sky-400 transition-colors">
                  Admin Kurator
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
