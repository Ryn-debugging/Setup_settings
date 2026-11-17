import { NextRequest, NextResponse } from 'next/server';
import { bulkInsertComponents } from '@/lib/db';
import { COMPONENT_CATEGORIES, ComponentCategory } from '@/types/pc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Daftar komponen untuk import CSV kosong' },
        { status: 400 }
      );
    }

    const validated = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const cat = String(row.category || '').trim() as ComponentCategory;
      if (!COMPONENT_CATEGORIES.includes(cat)) {
        errors.push(`Baris ${i + 1}: Kategori "${row.category}" tidak valid`);
        continue;
      }
      if (!row.name || !row.brand || isNaN(Number(row.price))) {
        errors.push(`Baris ${i + 1}: Nama, brand, atau harga tidak lengkap`);
        continue;
      }

      validated.push({
        category: cat,
        name: String(row.name).trim(),
        brand: String(row.brand).trim(),
        price: Math.max(0, Math.round(Number(row.price))),
        wattage: Math.max(0, Math.round(Number(row.wattage || 0))),
        performance_score: Math.min(
          100,
          Math.max(1, Math.round(Number(row.performance_score || 50)))
        ),
        image_url: row.image_url ? String(row.image_url).trim() : undefined,
        specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
      });
    }

    if (validated.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada baris CSV yang valid', details: errors },
        { status: 400 }
      );
    }

    const result = await bulkInsertComponents(validated);

    return NextResponse.json({
      insertedCount: result.insertedCount,
      components: result.components,
      warnings: errors,
    });
  } catch (error) {
    console.error('POST /api/components/bulk error:', error);
    return NextResponse.json({ error: 'Gagal memproses bulk import CSV' }, { status: 500 });
  }
}
