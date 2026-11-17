import { NextRequest, NextResponse } from 'next/server';
import { deleteComponent, updateComponent } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updated = await updateComponent(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ component: updated });
  } catch (error) {
    console.error('PATCH /api/components/[id] error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui komponen' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ok = await deleteComponent(id);
    if (!ok) {
      return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('DELETE /api/components/[id] error:', error);
    return NextResponse.json({ error: 'Gagal menghapus komponen' }, { status: 500 });
  }
}
