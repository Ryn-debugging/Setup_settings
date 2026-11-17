import { NextRequest, NextResponse } from 'next/server';
import { getSavedBuildBySlug } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const build = await getSavedBuildBySlug(slug);
    if (!build) {
      return NextResponse.json({ error: 'Rakitan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ build });
  } catch (error) {
    console.error('GET /api/builds/[slug] error:', error);
    return NextResponse.json({ error: 'Gagal memuat data rakitan' }, { status: 500 });
  }
}
