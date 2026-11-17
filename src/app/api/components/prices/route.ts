import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateComponentPrices } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada perubahan harga yang dikirim' },
        { status: 400 }
      );
    }

    const result = await bulkUpdateComponentPrices(updates);
    return NextResponse.json({
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    console.error('PATCH /api/components/prices error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui harga secara massal' },
      { status: 500 }
    );
  }
}
