-- =============================================================================
-- 011_gallery_points_config.sql — Gallery work categories and points config
-- From balls_detailed.txt: categories, subtypes, complexity, points
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE gallery_work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES gallery_work_categories(id)
);

CREATE TABLE gallery_points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES gallery_work_categories(id) ON DELETE CASCADE,
  code TEXT,
  subtype TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK (complexity IN ('low', 'medium', 'high', 'expert', 'bonus')),
  points_min NUMERIC(6,2) NOT NULL,
  points_max NUMERIC(6,2) NOT NULL,
  is_bonus BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_gallery_points_config_category ON gallery_points_config(category_id);
CREATE UNIQUE INDEX idx_gallery_work_categories_code ON gallery_work_categories(code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX idx_gallery_points_config_category_code ON gallery_points_config(category_id, code) WHERE code IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE gallery_work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_points_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gallery_work_categories_select ON gallery_work_categories;
CREATE POLICY gallery_work_categories_select ON gallery_work_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gallery_points_config_select ON gallery_points_config;
CREATE POLICY gallery_points_config_select ON gallery_points_config
  FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- Seed: categories (code = slug, name = display)
-- -----------------------------------------------------------------------------
INSERT INTO gallery_work_categories (id, code, name, parent_id) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, '2d-scene', '2D Scene', NULL),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, '3d-scene', '3D Scene', NULL),
  ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, 'vfx-animation', 'VFX Animation', NULL),
  ('a1b2c3d4-0004-4000-8000-000000000004'::uuid, 'music-fireworks-sync', 'Music/Fireworks Sync', NULL),
  ('a1b2c3d4-0005-4000-8000-000000000005'::uuid, 'choreography', 'Choreography', NULL),
  ('a1b2c3d4-0006-4000-8000-000000000006'::uuid, 'group-flight', 'Group Flight', NULL),
  ('a1b2c3d4-0007-4000-8000-000000000007'::uuid, 'complex-painting', 'Complex Painting', NULL),
  ('a1b2c3d4-0008-4000-8000-000000000008'::uuid, 'commercial-preview', 'Commercial Preview', NULL),
  ('a1b2c3d4-0009-4000-8000-000000000009'::uuid, 'animation-assembly', 'Animation Assembly', NULL),
  ('a1b2c3d4-000a-4000-8000-00000000000a'::uuid, 'pre-sale-preview', 'Pre-sale Preview', NULL),
  ('a1b2c3d4-000b-4000-8000-00000000000b'::uuid, '2d-scene-concept', '2D Scene Concept', NULL),
  ('a1b2c3d4-000c-4000-8000-00000000000c'::uuid, '3d-scene-concept', '3D Scene Concept', NULL),
  ('a1b2c3d4-000d-4000-8000-00000000000d'::uuid, 'storyboard', 'Storyboard', NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- -----------------------------------------------------------------------------
-- Seed: points config (subtypes per category) — idempotent
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM gallery_points_config LIMIT 1) THEN
    INSERT INTO gallery_points_config (category_id, code, subtype, complexity, points_min, points_max, is_bonus) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, 'static-simple', 'Static simple', 'low', 2, 3, false),
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, 'dynamic-simple', 'Dynamic simple', 'medium', 3, 5, false),
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, 'static-complex', 'Static complex', 'medium', 4, 6, false),
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, 'dynamic-complex', 'Dynamic complex', 'high', 5, 8, false),
  ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, 'rework-points-bonus', 'Rework points bonus', 'bonus', 0.5, 0.5, true),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, 'static-simple', 'Static simple', 'medium', 4, 6, false),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, 'dynamic-simple', 'Dynamic simple', 'medium', 5, 8, false),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, 'static-complex', 'Static complex', 'high', 6, 10, false),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, 'dynamic-complex', 'Dynamic complex', 'expert', 8, 14, false),
  ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, 'rework-points-bonus', 'Rework points bonus', 'bonus', 1.5, 2, true),
  ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, 'pyro-drones', 'Pyro drones', 'medium', 4, 6, false),
  ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, 'flash-drones', 'Flash drones', 'medium', 3, 5, false),
  ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, 'insta-cam', 'Insta-cam', 'high', 5, 8, false),
  ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, 'laser-drone', 'Laser drone', 'high', 5, 8, false),
  ('a1b2c3d4-0004-4000-8000-000000000004'::uuid, 'sync', 'Sync', 'high', 8, 8, false),
  ('a1b2c3d4-0005-4000-8000-000000000005'::uuid, 'complex-transitions', 'Complex transitions', 'high', 6, 10, false),
  ('a1b2c3d4-0005-4000-8000-000000000005'::uuid, 'complex-landings', 'Complex landings', 'high', 6, 10, false),
  ('a1b2c3d4-0005-4000-8000-000000000005'::uuid, 'non-standard-location', 'Non-standard location', 'expert', 9, 14, false),
  ('a1b2c3d4-0006-4000-8000-000000000006'::uuid, '2-groups', '2 groups', 'high', 10, 14, false),
  ('a1b2c3d4-0006-4000-8000-000000000006'::uuid, '3-plus-groups', '3+ groups', 'expert', 14, 20, false),
  ('a1b2c3d4-0007-4000-8000-000000000007'::uuid, 'specific-painting', 'Specific painting', 'medium', 4, 6, false),
  ('a1b2c3d4-0007-4000-8000-000000000007'::uuid, 'problematic-leds', 'Problematic LEDs', 'high', 6, 9, false),
  ('a1b2c3d4-0008-4000-8000-000000000008'::uuid, 'full-client-preview', 'Full client preview', 'high', 12, 12, false),
  ('a1b2c3d4-0009-4000-8000-000000000009'::uuid, 'base-assembly', 'Base assembly', 'expert', 30, 35, false),
  ('a1b2c3d4-0009-4000-8000-000000000009'::uuid, 'on-time-bonus', 'On-time bonus', 'bonus', 5, 5, true),
  ('a1b2c3d4-0009-4000-8000-000000000009'::uuid, 'no-critical-errors-bonus', 'No critical errors bonus', 'bonus', 10, 10, true),
  ('a1b2c3d4-000a-4000-8000-00000000000a'::uuid, 'sales-marketing', 'Sales/marketing', 'medium', 4, 6, false),
  ('a1b2c3d4-000b-4000-8000-00000000000b'::uuid, 'key-frame', 'Key frame', 'medium', 3, 5, false),
  ('a1b2c3d4-000c-4000-8000-00000000000c'::uuid, 'key-frame', 'Key frame', 'high', 5, 8, false),
  ('a1b2c3d4-000d-4000-8000-00000000000d'::uuid, 'up-to-5-slides-basic', 'Up to 5 slides basic', 'low', 3, 5, false),
  ('a1b2c3d4-000d-4000-8000-00000000000d'::uuid, 'up-to-10-slides-detailed', 'Up to 10 slides detailed', 'medium', 6, 10, false),
  ('a1b2c3d4-000d-4000-8000-00000000000d'::uuid, '10-plus-slides-basic', '10+ slides basic', 'high', 8, 12, false),
  ('a1b2c3d4-000d-4000-8000-00000000000d'::uuid, '10-plus-slides-full-script', '10+ slides full script', 'expert', 12, 18, false);
  END IF;
END $$;
