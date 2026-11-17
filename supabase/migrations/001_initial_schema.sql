-- ============================================================================
-- RakitPC.id — Supabase PostgreSQL Database Schema & Row Level Security (RLS)
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create ENUM type for PC Component Categories
DO $$ BEGIN
    CREATE TYPE component_category AS ENUM (
        'CPU',
        'Motherboard',
        'RAM',
        'GPU',
        'Storage',
        'PSU',
        'Case',
        'Cooler'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: components
-- Stores the entire PC hardware catalog with JSONB specifications per category.
CREATE TABLE IF NOT EXISTS public.components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category component_category NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    wattage INTEGER NOT NULL DEFAULT 0 CHECK (wattage >= 0),
    performance_score INTEGER NOT NULL DEFAULT 50 CHECK (performance_score >= 1 AND performance_score <= 100),
    image_url TEXT,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtering & catalog queries
CREATE INDEX IF NOT EXISTS idx_components_category ON public.components (category);
CREATE INDEX IF NOT EXISTS idx_components_brand ON public.components (brand);
CREATE INDEX IF NOT EXISTS idx_components_price ON public.components (price);
CREATE INDEX IF NOT EXISTS idx_components_specs ON public.components USING GIN (specs);

-- 3. Table: saved_builds
-- Stores user-shared PC configurations accessible via unique short slug (/build/[slug]).
CREATE TABLE IF NOT EXISTS public.saved_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Rakitan PC Kustom',
    use_case VARCHAR(100) NOT NULL DEFAULT '1080p Gaming',
    total_price INTEGER NOT NULL DEFAULT 0 CHECK (total_price >= 0),
    total_wattage INTEGER NOT NULL DEFAULT 0 CHECK (total_wattage >= 0),
    bottleneck_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_builds_slug ON public.saved_builds (slug);

-- 4. Table: build_items
-- Relational link between saved_builds and components (supports multi-unit RAM/Storage).
CREATE TABLE IF NOT EXISTS public.build_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL REFERENCES public.saved_builds(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 16)
);

CREATE INDEX IF NOT EXISTS idx_build_items_build_id ON public.build_items (build_id);

-- ============================================================================
-- Row Level Security (RLS) Policies (Per PRD Section 7)
-- ============================================================================

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_items ENABLE ROW LEVEL SECURITY;

-- Public has READ access to components
DROP POLICY IF EXISTS "Public can read components" ON public.components;
CREATE POLICY "Public can read components"
    ON public.components
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Authenticated Admin users have full INSERT/UPDATE/DELETE access to components
DROP POLICY IF EXISTS "Admins can insert components" ON public.components;
CREATE POLICY "Admins can insert components"
    ON public.components
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update components" ON public.components;
CREATE POLICY "Admins can update components"
    ON public.components
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete components" ON public.components;
CREATE POLICY "Admins can delete components"
    ON public.components
    FOR DELETE
    TO authenticated
    USING (true);

-- Public has READ and INSERT access on saved_builds & build_items
DROP POLICY IF EXISTS "Public can read saved_builds" ON public.saved_builds;
CREATE POLICY "Public can read saved_builds"
    ON public.saved_builds
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can insert saved_builds" ON public.saved_builds;
CREATE POLICY "Public can insert saved_builds"
    ON public.saved_builds
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read build_items" ON public.build_items;
CREATE POLICY "Public can read build_items"
    ON public.build_items
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can insert build_items" ON public.build_items;
CREATE POLICY "Public can insert build_items"
    ON public.build_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
