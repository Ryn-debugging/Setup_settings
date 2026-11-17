import React from 'react';
import type { Metadata } from 'next';
import { getAllComponents } from '@/lib/db';
import { CatalogExplorer } from '@/components/CatalogExplorer';

export const metadata: Metadata = {
  title: 'Katalog Komponen PC & Filter Spesifikasi Teknis',
  description:
    'Cari dan bandingkan harga CPU, Motherboard, RAM, GPU, SSD NVMe, PSU, Casing, dan CPU Cooler di Indonesia lengkap dengan filter Socket, DDR, dan skor performa.',
};

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const catalog = await getAllComponents();

  return <CatalogExplorer initialCatalog={catalog} />;
}
