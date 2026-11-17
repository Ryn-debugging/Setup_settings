import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllComponents, getSavedBuildBySlug } from '@/lib/db';
import { PublicBuildView } from '@/components/PublicBuildView';

export const dynamic = 'force-dynamic';

export async function generateMetadata(context: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await context.params;
  const build = await getSavedBuildBySlug(slug);
  if (!build) {
    return {
      title: 'Rakitan Tidak Ditemukan',
    };
  }
  return {
    title: `${build.title} — Spesifikasi Rakitan PC (${build.use_case})`,
    description: `Lihat spesifikasi lengkap, validasi kompatibilitas, dan analisis bottleneck untuk "${build.title}". Clone & edit rakitan ini di RakitPC.id.`,
  };
}

export default async function SharedBuildPage(context: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await context.params;
  const [build, catalog] = await Promise.all([
    getSavedBuildBySlug(slug),
    getAllComponents(),
  ]);

  if (!build) {
    notFound();
  }

  return <PublicBuildView build={build} catalog={catalog} />;
}
