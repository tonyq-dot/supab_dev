-- ============================================================
-- Ручной запуск миграций (Supabase SQL Editor)
-- Выполните этот файл целиком в Dashboard → SQL Editor → New query
-- Ошибка CLI "orioledb" не позволяет использовать supabase link/db push
-- ============================================================

-- 1. Gallery points config
CREATE TABLE IF NOT EXISTS gallery_work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES gallery_work_categories(id)
);

CREATE TABLE IF NOT EXISTS gallery_points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES gallery_work_categories(id) ON DELETE CASCADE,
  code TEXT,
  subtype TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK (complexity IN ('low', 'medium', 'high', 'expert', 'bonus')),
  points_min NUMERIC(6,2) NOT NULL,
  points_max NUMERIC(6,2) NOT NULL,
  is_bonus BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE gallery_work_categories ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE gallery_points_config ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_work_categories_code ON gallery_work_categories(code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_points_config_category_code ON gallery_points_config(category_id, code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_points_config_category ON gallery_points_config(category_id);

ALTER TABLE gallery_work_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gallery_work_categories_select ON gallery_work_categories;
CREATE POLICY gallery_work_categories_select ON gallery_work_categories FOR SELECT TO authenticated USING (true);

ALTER TABLE gallery_points_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gallery_points_config_select ON gallery_points_config;
CREATE POLICY gallery_points_config_select ON gallery_points_config FOR SELECT TO authenticated USING (true);

-- Seed: code (slug), name (display)
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

-- Backfill code for existing categories
UPDATE gallery_work_categories SET code = '2d-scene' WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid;
UPDATE gallery_work_categories SET code = '3d-scene' WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid;
UPDATE gallery_work_categories SET code = 'vfx-animation' WHERE id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid;
UPDATE gallery_work_categories SET code = 'music-fireworks-sync' WHERE id = 'a1b2c3d4-0004-4000-8000-000000000004'::uuid;
UPDATE gallery_work_categories SET code = 'choreography' WHERE id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid;
UPDATE gallery_work_categories SET code = 'group-flight' WHERE id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid;
UPDATE gallery_work_categories SET code = 'complex-painting' WHERE id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid;
UPDATE gallery_work_categories SET code = 'commercial-preview' WHERE id = 'a1b2c3d4-0008-4000-8000-000000000008'::uuid;
UPDATE gallery_work_categories SET code = 'animation-assembly' WHERE id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid;
UPDATE gallery_work_categories SET code = 'pre-sale-preview' WHERE id = 'a1b2c3d4-000a-4000-8000-00000000000a'::uuid;
UPDATE gallery_work_categories SET code = '2d-scene-concept' WHERE id = 'a1b2c3d4-000b-4000-8000-00000000000b'::uuid;
UPDATE gallery_work_categories SET code = '3d-scene-concept' WHERE id = 'a1b2c3d4-000c-4000-8000-00000000000c'::uuid;
UPDATE gallery_work_categories SET code = 'storyboard' WHERE id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid;

-- Update existing Russian names to English (idempotent)
UPDATE gallery_work_categories SET name = '2D Scene' WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND name = '2Д Сцена';
UPDATE gallery_work_categories SET name = '3D Scene' WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND name = '3Д Сцена';
UPDATE gallery_work_categories SET name = 'VFX Animation' WHERE id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND name = 'Анимация спецэффектов';
UPDATE gallery_work_categories SET name = 'Music/Fireworks Sync' WHERE id = 'a1b2c3d4-0004-4000-8000-000000000004'::uuid AND name = 'Синхронизация с музыкой, фейерверками';
UPDATE gallery_work_categories SET name = 'Choreography' WHERE id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND name = 'Хореография';
UPDATE gallery_work_categories SET name = 'Group Flight' WHERE id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid AND name = 'Полет группами';
UPDATE gallery_work_categories SET name = 'Complex Painting' WHERE id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid AND name = 'Сложная покраска';
UPDATE gallery_work_categories SET name = 'Commercial Preview' WHERE id = 'a1b2c3d4-0008-4000-8000-000000000008'::uuid AND name = 'Превью (коммерческое)';
UPDATE gallery_work_categories SET name = 'Animation Assembly' WHERE id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND name = 'Сборка анимации';
UPDATE gallery_work_categories SET name = 'Pre-sale Preview' WHERE id = 'a1b2c3d4-000a-4000-8000-00000000000a'::uuid AND name = 'Превью (пре-сейл)';
UPDATE gallery_work_categories SET name = '2D Scene Concept' WHERE id = 'a1b2c3d4-000b-4000-8000-00000000000b'::uuid AND name = 'Концепт 2Д сцены';
UPDATE gallery_work_categories SET name = '3D Scene Concept' WHERE id = 'a1b2c3d4-000c-4000-8000-00000000000c'::uuid AND name = 'Концепт 3Д сцены';
UPDATE gallery_work_categories SET name = 'Storyboard' WHERE id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND name = 'Сториборд';

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

-- Update existing Russian subtypes to English (idempotent)
UPDATE gallery_points_config SET subtype = 'Static simple' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Статичная, простая';
UPDATE gallery_points_config SET subtype = 'Dynamic simple' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Динамичная, простая';
UPDATE gallery_points_config SET subtype = 'Static complex' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Статичная, сложная';
UPDATE gallery_points_config SET subtype = 'Dynamic complex' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Динамичная, сложная';
UPDATE gallery_points_config SET subtype = 'Rework points bonus' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Доп. за переделку точек';
UPDATE gallery_points_config SET subtype = 'Static simple' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Статичная, простая';
UPDATE gallery_points_config SET subtype = 'Dynamic simple' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Динамичная, простая';
UPDATE gallery_points_config SET subtype = 'Static complex' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Статичная, сложная';
UPDATE gallery_points_config SET subtype = 'Dynamic complex' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Динамичная, сложная';
UPDATE gallery_points_config SET subtype = 'Rework points bonus' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Доп. за переделку точек';
UPDATE gallery_points_config SET subtype = 'Pyro drones' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Анимация пиро-дронов';
UPDATE gallery_points_config SET subtype = 'Flash drones' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Анимация флэш-дронов';
UPDATE gallery_points_config SET subtype = 'Insta-cam' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Анимация для инста-камеры';
UPDATE gallery_points_config SET subtype = 'Laser drone' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Анимация для лазер-дрона';
UPDATE gallery_points_config SET subtype = 'Sync' WHERE category_id = 'a1b2c3d4-0004-4000-8000-000000000004'::uuid AND subtype = 'Синхронизация';
UPDATE gallery_points_config SET subtype = 'Complex transitions' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Наличие сложных переходов';
UPDATE gallery_points_config SET subtype = 'Complex landings' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Наличие сложных посадок/взлётов';
UPDATE gallery_points_config SET subtype = 'Non-standard location' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Полет под нестандартную локацию';
UPDATE gallery_points_config SET subtype = '2 groups' WHERE category_id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid AND subtype = 'Разделение на 2 группы';
UPDATE gallery_points_config SET subtype = '3+ groups' WHERE category_id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid AND subtype = 'Разделение на 2+ группы (3+)';
UPDATE gallery_points_config SET subtype = 'Specific painting' WHERE category_id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid AND subtype = 'Специфическая покраска';
UPDATE gallery_points_config SET subtype = 'Problematic LEDs' WHERE category_id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid AND subtype = 'Настройка под проблемные LED';
UPDATE gallery_points_config SET subtype = 'Full client preview' WHERE category_id = 'a1b2c3d4-0008-4000-8000-000000000008'::uuid AND subtype = 'Превью полной версии для клиента';
UPDATE gallery_points_config SET subtype = 'Base assembly' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'Базовая техническая сборка';
UPDATE gallery_points_config SET subtype = 'On-time bonus' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'Фактор доп: Сделано в срок';
UPDATE gallery_points_config SET subtype = 'No critical errors bonus' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'Фактор доп: Без критических ошибок';
UPDATE gallery_points_config SET subtype = 'Sales/marketing' WHERE category_id = 'a1b2c3d4-000a-4000-8000-00000000000a'::uuid AND subtype = 'Для отдела продаж/маркетинга';
UPDATE gallery_points_config SET subtype = 'Key frame' WHERE category_id = 'a1b2c3d4-000b-4000-8000-00000000000b'::uuid AND subtype = 'Ключевой кадр';
UPDATE gallery_points_config SET subtype = 'Key frame' WHERE category_id = 'a1b2c3d4-000c-4000-8000-00000000000c'::uuid AND subtype = 'Ключевой кадр';
UPDATE gallery_points_config SET subtype = 'Up to 5 slides basic' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = 'До 5 слайдов, базовый';
UPDATE gallery_points_config SET subtype = 'Up to 10 slides detailed' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = 'До 10 слайдов, проработанный';
UPDATE gallery_points_config SET subtype = '10+ slides basic' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = '10+ слайдов, базовый';
UPDATE gallery_points_config SET subtype = '10+ slides full script' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = '10+ слайдов, проработанный сценарий';

-- Backfill code for existing gallery_points_config (by category_id + subtype)
UPDATE gallery_points_config SET code = 'static-simple' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Static simple' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'dynamic-simple' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Dynamic simple' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'static-complex' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Static complex' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'dynamic-complex' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Dynamic complex' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'rework-points-bonus' WHERE category_id = 'a1b2c3d4-0001-4000-8000-000000000001'::uuid AND subtype = 'Rework points bonus' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'static-simple' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Static simple' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'dynamic-simple' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Dynamic simple' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'static-complex' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Static complex' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'dynamic-complex' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Dynamic complex' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'rework-points-bonus' WHERE category_id = 'a1b2c3d4-0002-4000-8000-000000000002'::uuid AND subtype = 'Rework points bonus' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'pyro-drones' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Pyro drones' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'flash-drones' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Flash drones' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'insta-cam' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Insta-cam' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'laser-drone' WHERE category_id = 'a1b2c3d4-0003-4000-8000-000000000003'::uuid AND subtype = 'Laser drone' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'sync' WHERE category_id = 'a1b2c3d4-0004-4000-8000-000000000004'::uuid AND subtype = 'Sync' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'complex-transitions' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Complex transitions' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'complex-landings' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Complex landings' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'non-standard-location' WHERE category_id = 'a1b2c3d4-0005-4000-8000-000000000005'::uuid AND subtype = 'Non-standard location' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = '2-groups' WHERE category_id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid AND subtype = '2 groups' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = '3-plus-groups' WHERE category_id = 'a1b2c3d4-0006-4000-8000-000000000006'::uuid AND subtype = '3+ groups' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'specific-painting' WHERE category_id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid AND subtype = 'Specific painting' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'problematic-leds' WHERE category_id = 'a1b2c3d4-0007-4000-8000-000000000007'::uuid AND subtype = 'Problematic LEDs' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'full-client-preview' WHERE category_id = 'a1b2c3d4-0008-4000-8000-000000000008'::uuid AND subtype = 'Full client preview' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'base-assembly' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'Base assembly' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'on-time-bonus' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'On-time bonus' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'no-critical-errors-bonus' WHERE category_id = 'a1b2c3d4-0009-4000-8000-000000000009'::uuid AND subtype = 'No critical errors bonus' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'sales-marketing' WHERE category_id = 'a1b2c3d4-000a-4000-8000-00000000000a'::uuid AND subtype = 'Sales/marketing' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'key-frame' WHERE category_id = 'a1b2c3d4-000b-4000-8000-00000000000b'::uuid AND subtype = 'Key frame' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'key-frame' WHERE category_id = 'a1b2c3d4-000c-4000-8000-00000000000c'::uuid AND subtype = 'Key frame' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'up-to-5-slides-basic' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = 'Up to 5 slides basic' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = 'up-to-10-slides-detailed' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = 'Up to 10 slides detailed' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = '10-plus-slides-basic' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = '10+ slides basic' AND (code IS NULL OR code = '');
UPDATE gallery_points_config SET code = '10-plus-slides-full-script' WHERE category_id = 'a1b2c3d4-000d-4000-8000-00000000000d'::uuid AND subtype = '10+ slides full script' AND (code IS NULL OR code = '');

-- 2. Storage config
CREATE TABLE IF NOT EXISTS storage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backend TEXT NOT NULL CHECK (backend IN ('local', 'supabase', 's3')),
  base_path TEXT NOT NULL DEFAULT 'gallery',
  s3_bucket TEXT,
  s3_region TEXT,
  is_default BOOLEAN DEFAULT true
);

INSERT INTO storage_config (backend, base_path, is_default)
SELECT 'supabase', 'gallery-media', true
WHERE NOT EXISTS (SELECT 1 FROM storage_config WHERE is_default = true);

ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS storage_config_select ON storage_config;
CREATE POLICY storage_config_select ON storage_config FOR SELECT TO authenticated USING (true);

-- 3. Publications (только если media_items существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_items') THEN
    CREATE TABLE IF NOT EXISTS publications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      work_log_id UUID REFERENCES work_logs(id) ON DELETE SET NULL,
      title TEXT,
      source TEXT NOT NULL DEFAULT 'web_ui' CHECK (source IN ('web_ui', 'telegram', 'api', 'houdini', 'telegram_repost')),
      external_id TEXT,
      telegram_chat_id TEXT,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      published_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS publication_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_backend TEXT NOT NULL DEFAULT 'supabase',
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'gif', 'video')),
      points_config_id UUID REFERENCES gallery_points_config(id) ON DELETE SET NULL,
      points_assigned NUMERIC(8,2),
      estimated_hours NUMERIC(6,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      UNIQUE(publication_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS publication_version_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      change_description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO publications (id, author_id, project_id, work_log_id, title, source, is_published, published_url, created_at, updated_at)
    SELECT mi.id, mi.uploaded_by,
      (SELECT project_id FROM work_logs WHERE id = mi.work_log_id LIMIT 1),
      mi.work_log_id, NULL, 'web_ui', COALESCE(mi.is_published, false), mi.published_url, mi.created_at, mi.created_at
    FROM media_items mi;

    INSERT INTO publication_versions (publication_id, version_number, storage_path, storage_backend, media_type, created_by)
    SELECT mi.id, 1, mi.storage_path, 'supabase', mi.media_type, mi.uploaded_by FROM media_items mi;

    ALTER TABLE media_tags DROP CONSTRAINT IF EXISTS media_tags_media_id_fkey;
    ALTER TABLE media_tags ADD CONSTRAINT media_tags_media_id_fkey FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

    ALTER TABLE video_comments DROP CONSTRAINT IF EXISTS video_comments_media_id_fkey;
    ALTER TABLE video_comments ADD CONSTRAINT video_comments_media_id_fkey FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

    DROP TABLE media_items;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'publications') THEN
    CREATE TABLE publications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      work_log_id UUID REFERENCES work_logs(id) ON DELETE SET NULL,
      title TEXT,
      source TEXT NOT NULL DEFAULT 'web_ui' CHECK (source IN ('web_ui', 'telegram', 'api', 'houdini', 'telegram_repost')),
      external_id TEXT,
      telegram_chat_id TEXT,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      published_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE publication_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_backend TEXT NOT NULL DEFAULT 'supabase',
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'gif', 'video')),
      points_config_id UUID REFERENCES gallery_points_config(id) ON DELETE SET NULL,
      points_assigned NUMERIC(8,2),
      estimated_hours NUMERIC(6,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      UNIQUE(publication_id, version_number)
    );

    CREATE TABLE publication_version_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      change_description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- RLS для publications (если таблица создана)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'publications') THEN
    ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS publications_select_own ON publications;
    CREATE POLICY publications_select_own ON publications FOR SELECT USING (author_id = auth.uid());
    DROP POLICY IF EXISTS publications_select_manager ON publications;
    CREATE POLICY publications_select_manager ON publications FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
    DROP POLICY IF EXISTS publications_insert ON publications;
    CREATE POLICY publications_insert ON publications FOR INSERT WITH CHECK (author_id = auth.uid());
    DROP POLICY IF EXISTS publications_update ON publications;
    CREATE POLICY publications_update ON publications FOR UPDATE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
    DROP POLICY IF EXISTS publications_delete ON publications;
    CREATE POLICY publications_delete ON publications FOR DELETE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

    ALTER TABLE publication_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS publication_versions_select ON publication_versions;
    CREATE POLICY publication_versions_select ON publication_versions FOR SELECT USING (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))));
    DROP POLICY IF EXISTS publication_versions_insert ON publication_versions;
    CREATE POLICY publication_versions_insert ON publication_versions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND p.author_id = auth.uid()));
    DROP POLICY IF EXISTS publication_versions_update ON publication_versions;
    CREATE POLICY publication_versions_update ON publication_versions FOR UPDATE USING (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))));
    DROP POLICY IF EXISTS publication_versions_delete ON publication_versions;
    CREATE POLICY publication_versions_delete ON publication_versions FOR DELETE USING (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))));

    ALTER TABLE publication_version_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS publication_version_history_select ON publication_version_history;
    CREATE POLICY publication_version_history_select ON publication_version_history FOR SELECT USING (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))));
    DROP POLICY IF EXISTS publication_version_history_insert ON publication_version_history;
    CREATE POLICY publication_version_history_insert ON publication_version_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id AND p.author_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_publications_author ON publications(author_id);
CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id);
CREATE INDEX IF NOT EXISTS idx_publications_work_log ON publications(work_log_id);
CREATE INDEX IF NOT EXISTS idx_publication_versions_publication ON publication_versions(publication_id);

-- 4. API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_keys_select ON api_keys;
CREATE POLICY api_keys_select ON api_keys FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
DROP POLICY IF EXISTS api_keys_insert ON api_keys;
CREATE POLICY api_keys_insert ON api_keys FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
DROP POLICY IF EXISTS api_keys_delete ON api_keys;
CREATE POLICY api_keys_delete ON api_keys FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

-- 5. View
CREATE OR REPLACE VIEW publication_latest AS
SELECT DISTINCT ON (p.id)
  p.id, p.author_id, p.project_id, p.work_log_id, p.title, p.source, p.external_id, p.telegram_chat_id,
  p.is_published, p.published_url, p.created_at, p.updated_at,
  pv.id AS version_id, pv.version_number, pv.storage_path, pv.storage_backend, pv.media_type,
  pv.points_config_id, pv.points_assigned, pv.estimated_hours, pv.created_at AS version_created_at, pv.created_by
FROM publications p
JOIN publication_versions pv ON pv.publication_id = p.id
ORDER BY p.id, pv.version_number DESC;
