import { NextRequest, NextResponse } from 'next/server';
import { createSavedBuild, getAllSavedBuilds } from '@/lib/db';

export async function GET() {
  try {
    const builds = await getAllSavedBuilds();
    return NextResponse.json({ builds });
  } catch (error) {
    console.error('GET /api/builds error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar rakitan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, use_case, total_price, total_wattage, bottleneck_info, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal 1 komponen sebelum menyimpan tautan rakitan' },
        { status: 400 }
      );
    }

    const saved = await createSavedBuild({
      title: String(title || 'Rakitan PC Kustom').trim(),
      use_case: String(use_case || '1080p Gaming'),
      total_price: Number(total_price || 0),
      total_wattage: Number(total_wattage || 0),
      bottleneck_info: bottleneck_info || {},
      items,
    });

    return NextResponse.json({ build: saved }, { status: 201 });
  } catch (error) {
    console.error('POST /api/builds error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan tautan rakitan' }, { status: 500 });
  }
}
