import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllComponents } from '@/lib/db';
import { BuilderWorkspace } from '@/components/BuilderWorkspace';

export const metadata: Metadata = {
  title: 'Workspace Simulasi Perakitan PC & Validasi Kompatibilitas',
  description:
    'Pilih CPU, Motherboard, RAM, GPU, Storage, PSU, Casing, dan CPU Cooler dengan Smart Filter kompatibilitas otomatis, kalkulator bottleneck, dan ekspor PNG/PDF.',
};

export const dynamic = 'force-dynamic';

export default async function BuilderPage() {
  const catalog = await getAllComponents();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="h-96 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
        </div>
      }
    >
      <BuilderWorkspace initialCatalog={catalog} />
    </Suspense>
  );
}
