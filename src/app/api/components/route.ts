import { NextRequest, NextResponse } from 'next/server';
import { createComponent, getAllComponents, getDatabaseStatus } from '@/lib/db';
import { ComponentCategory, COMPONENT_CATEGORIES } from '@/types/pc';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category') as ComponentCategory | null;
    const category =
      categoryParam && COMPONENT_CATEGORIES.includes(categoryParam)
        ? categoryParam
        : undefined;

    const components = await getAllComponents(category);
    const status = getDatabaseStatus();

    return NextResponse.json({
      components,
      status,
    });
  } catch (error) {
    console.error('GET /api/components error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data katalog komponen' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, name, brand, price, wattage, performance_score, image_url, specs } = body;

    if (!category || !COMPONENT_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Kategori komponen tidak valid' }, { status: 400 });
    }
    if (!name || !brand || price === undefined || Number(price) < 0) {
      return NextResponse.json(
        { error: 'Nama, brand, dan harga komponen wajib diisi dengan benar' },
        { status: 400 }
      );
    }

    const created = await createComponent({
      category,
      name: String(name).trim(),
      brand: String(brand).trim(),
      price: Math.round(Number(price)),
      wattage: Math.round(Number(wattage || 0)),
      performance_score: Math.min(100, Math.max(1, Math.round(Number(performance_score || 50)))),
      image_url: image_url ? String(image_url).trim() : undefined,
      specs: specs && typeof specs === 'object' ? specs : {},
    });

    return NextResponse.json({ component: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/components error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan komponen baru' }, { status: 500 });
  }
}
