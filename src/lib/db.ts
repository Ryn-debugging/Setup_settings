import fs from 'fs';
import path from 'path';
import { SEED_COMPONENTS } from '@/data/seed-components';
import { INITIAL_SAVED_BUILDS } from '@/data/preset-builds';
import {
  BottleneckAnalysis,
  ComponentCategory,
  PCComponent,
  SavedBuild,
  SavedBuildItemRecord,
} from '@/types/pc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

interface LocalDatabaseSchema {
  components: PCComponent[];
  saved_builds: SavedBuild[];
  updated_at: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'local-db.json');

function ensureLocalDb(): LocalDatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: LocalDatabaseSchema = {
        components: SEED_COMPONENTS,
        saved_builds: INITIAL_SAVED_BUILDS,
        updated_at: new Date().toISOString(),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as LocalDatabaseSchema;
    if (!parsed.components || parsed.components.length === 0) {
      parsed.components = SEED_COMPONENTS;
    }
    if (!parsed.saved_builds) {
      parsed.saved_builds = INITIAL_SAVED_BUILDS;
    }
    return parsed;
  } catch {
    return {
      components: [...SEED_COMPONENTS],
      saved_builds: [...INITIAL_SAVED_BUILDS],
      updated_at: new Date().toISOString(),
    };
  }
}

function saveLocalDb(data: LocalDatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local-db.json:', err);
  }
}

export async function getAllComponents(category?: ComponentCategory): Promise<PCComponent[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('components').select('*').order('price', { ascending: true });
      if (category) {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as PCComponent[];
      }
    } catch {
      // Fallback to local db if Supabase query fails
    }
  }

  const db = ensureLocalDb();
  const list = category
    ? db.components.filter((c) => c.category === category)
    : db.components;
  return [...list].sort((a, b) => a.price - b.price);
}

export async function getComponentById(id: string): Promise<PCComponent | null> {
  const all = await getAllComponents();
  return all.find((c) => c.id === id) || null;
}

export async function createComponent(
  payload: Omit<PCComponent, 'id' | 'created_at'> & { id?: string }
): Promise<PCComponent> {
  const id =
    payload.id ||
    `${payload.category.toLowerCase()}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 6)}`;

  const defaultImages: Record<ComponentCategory, string> = {
    CPU: payload.brand.toLowerCase().includes('intel')
      ? '/hardware/cpu-intel.svg'
      : '/hardware/cpu-amd.svg',
    Motherboard: '/hardware/motherboard.svg',
    RAM: '/hardware/ram.svg',
    GPU: '/hardware/gpu.svg',
    Storage: '/hardware/storage.svg',
    PSU: '/hardware/psu.svg',
    Case: '/hardware/case.svg',
    Cooler: '/hardware/cooler.svg',
  };

  const newComp: PCComponent = {
    id,
    category: payload.category,
    name: payload.name,
    brand: payload.brand,
    price: Number(payload.price),
    wattage: Number(payload.wattage || 0),
    performance_score: Math.min(100, Math.max(1, Number(payload.performance_score || 50))),
    image_url: payload.image_url || defaultImages[payload.category] || '/hardware/motherboard.svg',
    specs: payload.specs || {},
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('components')
        .insert([
          {
            category: newComp.category,
            name: newComp.name,
            brand: newComp.brand,
            price: newComp.price,
            wattage: newComp.wattage,
            performance_score: newComp.performance_score,
            image_url: newComp.image_url,
            specs: newComp.specs,
          },
        ])
        .select()
        .single();
      if (!error && data) {
        return data as PCComponent;
      }
    } catch {
      // Fallback to local db
    }
  }

  const db = ensureLocalDb();
  db.components.push(newComp);
  saveLocalDb(db);
  return newComp;
}

export async function updateComponent(
  id: string,
  updates: Partial<PCComponent>
): Promise<PCComponent | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('components')
        .update({
          ...(updates.category ? { category: updates.category } : {}),
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.brand ? { brand: updates.brand } : {}),
          ...(updates.price !== undefined ? { price: Number(updates.price) } : {}),
          ...(updates.wattage !== undefined ? { wattage: Number(updates.wattage) } : {}),
          ...(updates.performance_score !== undefined
            ? { performance_score: Number(updates.performance_score) }
            : {}),
          ...(updates.image_url ? { image_url: updates.image_url } : {}),
          ...(updates.specs ? { specs: updates.specs } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        return data as PCComponent;
      }
    } catch {
      // Fallback
    }
  }

  const db = ensureLocalDb();
  const idx = db.components.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  db.components[idx] = {
    ...db.components[idx],
    ...updates,
    id, // preserve ID
    price: updates.price !== undefined ? Number(updates.price) : db.components[idx].price,
    wattage: updates.wattage !== undefined ? Number(updates.wattage) : db.components[idx].wattage,
    performance_score:
      updates.performance_score !== undefined
        ? Math.min(100, Math.max(1, Number(updates.performance_score)))
        : db.components[idx].performance_score,
    specs: updates.specs
      ? { ...db.components[idx].specs, ...updates.specs }
      : db.components[idx].specs,
    updated_at: new Date().toISOString(),
  };

  saveLocalDb(db);
  return db.components[idx];
}

export async function deleteComponent(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('components').delete().eq('id', id);
    } catch {
      // Fallback
    }
  }

  const db = ensureLocalDb();
  const before = db.components.length;
  db.components = db.components.filter((c) => c.id !== id);
  if (db.components.length !== before) {
    saveLocalDb(db);
    return true;
  }
  return false;
}

export async function bulkInsertComponents(
  items: Array<Omit<PCComponent, 'id' | 'created_at'> & { id?: string }>
): Promise<{ insertedCount: number; components: PCComponent[] }> {
  const created: PCComponent[] = [];
  for (const item of items) {
    const comp = await createComponent(item);
    created.push(comp);
  }
  return {
    insertedCount: created.length,
    components: created,
  };
}

export async function bulkUpdateComponentPrices(
  updates: Array<{ id: string; price: number }>
): Promise<{ updatedCount: number }> {
  const db = ensureLocalDb();
  let updatedCount = 0;

  for (const u of updates) {
    const idx = db.components.findIndex((c) => c.id === u.id);
    if (idx !== -1 && Number.isFinite(u.price) && u.price >= 0) {
      db.components[idx].price = Math.round(Number(u.price));
      db.components[idx].updated_at = new Date().toISOString();
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    saveLocalDb(db);
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    for (const u of updates) {
      try {
        await supabase
          .from('components')
          .update({ price: Math.round(Number(u.price)), updated_at: new Date().toISOString() })
          .eq('id', u.id);
      } catch {
        // Ignore individual errors on fallback
      }
    }
  }

  return { updatedCount };
}

function generateShortSlug(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export async function createSavedBuild(payload: {
  title: string;
  use_case: string;
  total_price: number;
  total_wattage: number;
  bottleneck_info: BottleneckAnalysis;
  items: Array<{ component_id: string; quantity: number }>;
}): Promise<SavedBuild> {
  const db = ensureLocalDb();
  let slug = generateShortSlug();
  while (db.saved_builds.some((b) => b.slug === slug)) {
    slug = generateShortSlug();
  }

  const hydratedItems: SavedBuildItemRecord[] = payload.items.map((item) => {
    const comp = db.components.find((c) => c.id === item.component_id);
    return {
      component_id: item.component_id,
      quantity: item.quantity,
      component: comp,
    };
  });

  const record: SavedBuild = {
    id: `build-${Date.now().toString(36)}-${slug}`,
    slug,
    title: payload.title || 'Rakitan PC Kustom',
    use_case: payload.use_case || '1080p Gaming',
    total_price: Number(payload.total_price || 0),
    total_wattage: Number(payload.total_wattage || 0),
    bottleneck_info: payload.bottleneck_info,
    created_at: new Date().toISOString(),
    items: hydratedItems,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: savedRow, error: saveErr } = await supabase
        .from('saved_builds')
        .insert([
          {
            slug: record.slug,
            title: record.title,
            use_case: record.use_case,
            total_price: record.total_price,
            total_wattage: record.total_wattage,
            bottleneck_info: record.bottleneck_info,
          },
        ])
        .select()
        .single();

      if (!saveErr && savedRow) {
        const buildItemsPayload = payload.items.map((it) => ({
          build_id: savedRow.id,
          component_id: it.component_id,
          quantity: it.quantity,
        }));
        await supabase.from('build_items').insert(buildItemsPayload);
      }
    } catch {
      // Fallback to local db
    }
  }

  db.saved_builds.unshift(record);
  saveLocalDb(db);
  return record;
}

export async function getSavedBuildBySlug(slug: string): Promise<SavedBuild | null> {
  const db = ensureLocalDb();
  const localMatch = db.saved_builds.find((b) => b.slug === slug);
  if (localMatch) {
    // Ensure components are hydrated with latest data
    const hydratedItems = localMatch.items.map((item) => ({
      ...item,
      component:
        item.component ||
        db.components.find((c) => c.id === item.component_id) ||
        SEED_COMPONENTS.find((c) => c.id === item.component_id),
    }));
    return {
      ...localMatch,
      items: hydratedItems,
    };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: buildRow, error } = await supabase
        .from('saved_builds')
        .select('*, build_items(*, components(*))')
        .eq('slug', slug)
        .single();

      if (!error && buildRow) {
        const items: SavedBuildItemRecord[] = (buildRow.build_items || []).map(
          (bi: { id: string; build_id: string; component_id: string; quantity: number; components?: PCComponent }) => ({
            id: bi.id,
            build_id: bi.build_id,
            component_id: bi.component_id,
            quantity: bi.quantity,
            component: bi.components,
          })
        );
        return {
          id: buildRow.id,
          slug: buildRow.slug,
          title: buildRow.title,
          use_case: buildRow.use_case,
          total_price: buildRow.total_price,
          total_wattage: buildRow.total_wattage,
          bottleneck_info: buildRow.bottleneck_info,
          created_at: buildRow.created_at,
          items,
        };
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export async function getAllSavedBuilds(): Promise<SavedBuild[]> {
  const db = ensureLocalDb();
  return db.saved_builds;
}

export function getDatabaseStatus() {
  const db = ensureLocalDb();
  return {
    mode: isSupabaseConfigured() ? 'supabase' : 'local-persistent',
    supabaseConfigured: isSupabaseConfigured(),
    componentCount: db.components.length,
    savedBuildCount: db.saved_builds.length,
    updatedAt: db.updated_at,
  };
}
