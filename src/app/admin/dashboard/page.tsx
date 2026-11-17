import React from 'react';
import type { Metadata } from 'next';
import { getAllComponents, getDatabaseStatus } from '@/lib/db';
import { AdminDashboardClient } from '@/components/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard Admin & Manajemen Katalog Komponen',
  description:
    'Panel kurator data RakitPC.id untuk CRUD komponen manual, Bulk Import CSV, dan Update Harga Massal.',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [catalog, status] = await Promise.all([
    getAllComponents(),
    Promise.resolve(getDatabaseStatus()),
  ]);

  return <AdminDashboardClient initialCatalog={catalog} dbStatus={status} />;
}
