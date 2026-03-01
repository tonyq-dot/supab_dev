-- ========== 001_schema.sql ==========
-- =============================================================================
-- 001_schema.sql — Core KPI schema
-- Dictionaries and operational tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
CREATE TYPE project_status AS ENUM ('Active', 'Archived');

-- -----------------------------------------------------------------------------
-- Dictionaries
-- -----------------------------------------------------------------------------
CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  value NUMERIC(4,2) NOT NULL,
  description TEXT
);

CREATE TABLE drone_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_drones INTEGER NOT NULL,
  max_drones INTEGER NOT NULL,
  coefficient NUMERIC(4,2) NOT NULL,
  UNIQUE(min_drones, max_drones)
);

CREATE TABLE work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_value NUMERIC(6,2) NOT NULL
);

CREATE TABLE rework_coefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  value NUMERIC(4,2) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Operational tables
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES project_types(id),
  drone_count INTEGER NOT NULL,
  is_rework BOOLEAN NOT NULL DEFAULT FALSE,
  status project_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  work_type_id UUID NOT NULL REFERENCES work_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE period_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL UNIQUE,
  norm_points INTEGER NOT NULL DEFAULT 500,
  company_profit_coef_q1 NUMERIC(4,2) NOT NULL DEFAULT 0.3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('animator', 'manager'))
);

CREATE TABLE user_salaries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(12,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX idx_work_logs_date ON work_logs(date);
CREATE INDEX idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX idx_projects_status ON projects(status);


-- ========== 002_views_detailed_scores.sql ==========
-- =============================================================================
-- 002_views_detailed_scores.sql — Score calculation view
-- Joins work_logs with projects, work_types, project_types, drone_ranges
-- Score = Base × Qty × K_type × K_drones × K_rework
-- =============================================================================

CREATE OR REPLACE VIEW detailed_scores AS
SELECT
  wl.id,
  wl.user_id,
  wl.project_id,
  wl.work_type_id,
  wl.quantity,
  wl.date,
  wl.image_url,
  wl.created_at,
  p.name AS project_name,
  p.drone_count,
  p.is_rework,
  pt.name AS project_type_name,
  pt.value AS k_type,
  wt.name AS work_type_name,
  wt.base_value AS base,
  dr.coefficient AS k_drones,
  CASE WHEN p.is_rework THEN 1.5 ELSE 1.0 END AS k_rework,
  (wt.base_value * wl.quantity * pt.value * dr.coefficient *
   (CASE WHEN p.is_rework THEN 1.5 ELSE 1.0 END))::NUMERIC(12,2) AS score
FROM work_logs wl
JOIN projects p ON wl.project_id = p.id
JOIN project_types pt ON p.type_id = pt.id
JOIN work_types wt ON wl.work_type_id = wt.id
JOIN LATERAL (
  SELECT coefficient FROM drone_ranges dr
  WHERE p.drone_count >= dr.min_drones AND p.drone_count <= dr.max_drones
  ORDER BY dr.min_drones DESC
  LIMIT 1
) dr ON true;


-- ========== 003_rls_policies.sql ==========
-- =============================================================================
-- 003_rls_policies.sql — Row Level Security
-- Animator: own data only | Manager: full access
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'manager'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_salaries ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- work_logs
-- -----------------------------------------------------------------------------
CREATE POLICY work_logs_select_own ON work_logs
  FOR SELECT USING (user_id = auth.uid() OR is_manager());
CREATE POLICY work_logs_insert_own ON work_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY work_logs_update_own ON work_logs
  FOR UPDATE USING (user_id = auth.uid() OR is_manager());
CREATE POLICY work_logs_delete_own ON work_logs
  FOR DELETE USING (user_id = auth.uid() OR is_manager());

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
CREATE POLICY projects_select ON projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated WITH CHECK (is_manager());
CREATE POLICY projects_update ON projects
  FOR UPDATE TO authenticated USING (is_manager());
CREATE POLICY projects_delete ON projects
  FOR DELETE TO authenticated USING (is_manager());

-- -----------------------------------------------------------------------------
-- period_configs
-- -----------------------------------------------------------------------------
CREATE POLICY period_configs_select ON period_configs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY period_configs_all ON period_configs
  FOR ALL TO authenticated USING (is_manager());

-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------
CREATE POLICY user_roles_select ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_manager());
CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT WITH CHECK (is_manager());
CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE USING (is_manager());

-- -----------------------------------------------------------------------------
-- user_salaries
-- -----------------------------------------------------------------------------
CREATE POLICY user_salaries_select_own ON user_salaries
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_salaries_insert ON user_salaries
  FOR INSERT WITH CHECK (is_manager());
CREATE POLICY user_salaries_update ON user_salaries
  FOR UPDATE USING (is_manager());

-- -----------------------------------------------------------------------------
-- Dictionaries (project_types, drone_ranges, work_types, rework_coefs)
-- -----------------------------------------------------------------------------
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rework_coefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_types_select ON project_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY project_types_modify ON project_types
  FOR ALL TO authenticated USING (is_manager());

CREATE POLICY drone_ranges_select ON drone_ranges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY drone_ranges_modify ON drone_ranges
  FOR ALL TO authenticated USING (is_manager());

CREATE POLICY work_types_select ON work_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY work_types_modify ON work_types
  FOR ALL TO authenticated USING (is_manager());

CREATE POLICY rework_coefs_select ON rework_coefs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rework_coefs_modify ON rework_coefs
  FOR ALL TO authenticated USING (is_manager());


-- ========== 004_storage_work_previews.sql ==========
-- =============================================================================
-- 004_storage_work_previews.sql — Storage bucket for work preview images
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-previews',
  'work-previews',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY work_previews_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work-previews' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY work_previews_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-previews');

CREATE POLICY work_previews_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'work-previews' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY work_previews_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'work-previews' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ========== 005_user_scores_aggregate.sql ==========
-- =============================================================================
-- 005_user_scores_aggregate.sql — Functions and views for user points
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: get user total points for a date range
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_points(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(score), 0)::NUMERIC(12,2)
  FROM detailed_scores
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- View: user_scores_summary (manager dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_scores_summary AS
SELECT
  ds.user_id,
  date_trunc('quarter', ds.date)::date AS quarter_start,
  SUM(ds.score)::NUMERIC(12,2) AS total_points,
  COUNT(*) AS work_count
FROM detailed_scores ds
GROUP BY ds.user_id, date_trunc('quarter', ds.date)::date;


-- ========== 006_trigger_new_user.sql ==========
-- =============================================================================
-- 006_trigger_new_user.sql — Auto-assign animator role to new users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'animator')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ========== 007_animator_projects.sql ==========
-- =============================================================================
-- 007_animator_projects.sql — Allow animators to create projects
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated WITH CHECK (true);


-- ========== 008_user_profiles.sql ==========
-- =============================================================================
-- 008_user_profiles.sql — User profiles (display name, nickname)
-- =============================================================================

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  nickname TEXT UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_profiles_select_manager ON user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
  );


-- ========== 009_gallery_media.sql ==========
-- =============================================================================
-- 009_gallery_media.sql — Gallery: tags, media_items, media_tags, video_comments
-- Note: media_items is replaced by publications in 013_publications_versioning.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- Media items (legacy; migrated to publications in 013)
-- -----------------------------------------------------------------------------
CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID REFERENCES work_logs(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'gif', 'video')),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(media_id, tag_id)
);

CREATE TABLE video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  timestamp_sec NUMERIC(10,2) NOT NULL,
  text TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_media_items_uploaded_by ON media_items(uploaded_by);
CREATE INDEX idx_media_items_work_log_id ON media_items(work_log_id);
CREATE INDEX idx_media_tags_media_id ON media_tags(media_id);
CREATE INDEX idx_video_comments_media_id ON video_comments(media_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY tags_insert ON tags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY media_items_select_own ON media_items FOR SELECT USING (uploaded_by = auth.uid());
CREATE POLICY media_items_select_manager ON media_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
CREATE POLICY media_items_insert ON media_items FOR INSERT WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY media_items_update ON media_items FOR UPDATE USING (
  uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
CREATE POLICY media_items_delete ON media_items FOR DELETE USING (
  uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);

CREATE POLICY media_tags_select ON media_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY media_tags_all ON media_tags FOR ALL TO authenticated USING (true);

CREATE POLICY video_comments_select ON video_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY video_comments_insert ON video_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY video_comments_update ON video_comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY video_comments_delete ON video_comments FOR DELETE USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);


-- ========== 010_gallery_storage_bucket.sql ==========
-- =============================================================================
-- 010_gallery_storage_bucket.sql — Storage bucket for gallery media
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-media',
  'gallery-media',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY gallery_media_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY gallery_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gallery-media');

CREATE POLICY gallery_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY gallery_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-media' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ========== 011_gallery_points_config.sql ==========
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


-- ========== 012_storage_config.sql ==========
-- =============================================================================
-- 012_storage_config.sql — Storage backend config (local/supabase/s3)
-- =============================================================================

CREATE TABLE storage_config (
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
CREATE POLICY storage_config_select ON storage_config
  FOR SELECT TO authenticated USING (true);


-- ========== 013_publications_versioning.sql ==========
-- =============================================================================
-- 013_publications_versioning.sql — Publications and versioning
-- Replaces media_items with publications + publication_versions
-- Handles: (A) migrate from media_items | (B) fresh install
-- =============================================================================

DO $$
BEGIN
  -- Path A: media_items exists — migrate data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_items') THEN
    -- -------------------------------------------------------------------------
    -- Create tables
    -- -------------------------------------------------------------------------
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

    -- Migrate data
    INSERT INTO publications (id, author_id, project_id, work_log_id, title, source, is_published, published_url, created_at, updated_at)
    SELECT
      mi.id, mi.uploaded_by,
      (SELECT project_id FROM work_logs WHERE id = mi.work_log_id LIMIT 1),
      mi.work_log_id, NULL, 'web_ui',
      COALESCE(mi.is_published, false), mi.published_url, mi.created_at, mi.created_at
    FROM media_items mi;

    INSERT INTO publication_versions (publication_id, version_number, storage_path, storage_backend, media_type, created_by)
    SELECT mi.id, 1, mi.storage_path, 'supabase', mi.media_type, mi.uploaded_by FROM media_items mi;

    -- Update FKs: media_tags, video_comments → publications
    ALTER TABLE media_tags DROP CONSTRAINT IF EXISTS media_tags_media_id_fkey;
    ALTER TABLE media_tags ADD CONSTRAINT media_tags_media_id_fkey
      FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

    ALTER TABLE video_comments DROP CONSTRAINT IF EXISTS video_comments_media_id_fkey;
    ALTER TABLE video_comments ADD CONSTRAINT video_comments_media_id_fkey
      FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

    DROP TABLE media_items;

  -- Path B: fresh install — create empty tables
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

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_publications_author ON publications(author_id);
CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id);
CREATE INDEX IF NOT EXISTS idx_publications_work_log ON publications(work_log_id);
CREATE INDEX IF NOT EXISTS idx_publication_versions_publication ON publication_versions(publication_id);

-- -----------------------------------------------------------------------------
-- RLS (only if publications exists)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'publications') THEN
    ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE publication_versions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE publication_version_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS publications_select_own ON publications;
    CREATE POLICY publications_select_own ON publications FOR SELECT USING (author_id = auth.uid());
    DROP POLICY IF EXISTS publications_select_manager ON publications;
    CREATE POLICY publications_select_manager ON publications FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
    );
    DROP POLICY IF EXISTS publications_insert ON publications;
    CREATE POLICY publications_insert ON publications FOR INSERT WITH CHECK (author_id = auth.uid());
    DROP POLICY IF EXISTS publications_update ON publications;
    CREATE POLICY publications_update ON publications FOR UPDATE USING (
      author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
    );
    DROP POLICY IF EXISTS publications_delete ON publications;
    CREATE POLICY publications_delete ON publications FOR DELETE USING (
      author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
    );

    DROP POLICY IF EXISTS publication_versions_select ON publication_versions;
    CREATE POLICY publication_versions_select ON publication_versions FOR SELECT USING (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id
        AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
    );
    DROP POLICY IF EXISTS publication_versions_insert ON publication_versions;
    CREATE POLICY publication_versions_insert ON publication_versions FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND p.author_id = auth.uid())
    );
    DROP POLICY IF EXISTS publication_versions_update ON publication_versions;
    CREATE POLICY publication_versions_update ON publication_versions FOR UPDATE USING (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id
        AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
    );
    DROP POLICY IF EXISTS publication_versions_delete ON publication_versions;
    CREATE POLICY publication_versions_delete ON publication_versions FOR DELETE USING (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id
        AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
    );

    DROP POLICY IF EXISTS publication_version_history_select ON publication_version_history;
    CREATE POLICY publication_version_history_select ON publication_version_history FOR SELECT USING (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id
        AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
    );
    DROP POLICY IF EXISTS publication_version_history_insert ON publication_version_history;
    CREATE POLICY publication_version_history_insert ON publication_version_history FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id AND p.author_id = auth.uid())
    );
  END IF;
END $$;


-- ========== 014_api_keys.sql ==========
-- =============================================================================
-- 014_api_keys.sql — API keys for external access (Telegram, Houdini, etc.)
-- =============================================================================

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
CREATE POLICY api_keys_select ON api_keys FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
DROP POLICY IF EXISTS api_keys_insert ON api_keys;
CREATE POLICY api_keys_insert ON api_keys FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
DROP POLICY IF EXISTS api_keys_delete ON api_keys;
CREATE POLICY api_keys_delete ON api_keys FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);


-- ========== 015_publication_latest_view.sql ==========
-- =============================================================================
-- 015_publication_latest_view.sql — View: publication with latest version
-- For gallery display
-- =============================================================================

CREATE OR REPLACE VIEW publication_latest AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.project_id,
  p.work_log_id,
  p.title,
  p.source,
  p.external_id,
  p.telegram_chat_id,
  p.is_published,
  p.published_url,
  p.created_at,
  p.updated_at,
  pv.id AS version_id,
  pv.version_number,
  pv.storage_path,
  pv.storage_backend,
  pv.media_type,
  pv.points_config_id,
  pv.points_assigned,
  pv.estimated_hours,
  pv.created_at AS version_created_at,
  pv.created_by
FROM publications p
JOIN publication_versions pv ON pv.publication_id = p.id
ORDER BY p.id, pv.version_number DESC;


-- ========== 016_seed.sql ==========
-- =============================================================================
-- 016_seed.sql — Initial dictionary data
-- Run after migrations. Idempotent (ON CONFLICT).
-- =============================================================================

-- project_types
INSERT INTO project_types (name, value, description) VALUES
  ('ШОУ', 2.0, 'Коммерческий проект, прибыль'),
  ('РАЗРАБОТКА', 1.5, 'Превью для клиента/концепт'),
  ('ПРЕВЬЮ', 1.5, 'Создание инструментов и оптимизация'),
  ('НАСТАВНИЧЕСТВО', 1.0, 'Обучение коллег'),
  ('ИННОВАЦИИ', 1.5, 'Технические инновации'),
  ('ПРОМО', 1.0, 'Некоммерческий проект')
ON CONFLICT (name) DO NOTHING;

-- drone_ranges
INSERT INTO drone_ranges (min_drones, max_drones, coefficient) VALUES
  (200, 499, 1.00),
  (500, 999, 1.15),
  (1000, 2999, 1.30),
  (3000, 4999, 1.50),
  (5000, 7999, 1.75),
  (10000, 15000, 2.00)
ON CONFLICT (min_drones, max_drones) DO NOTHING;

-- work_types
INSERT INTO work_types (name, base_value) VALUES
  ('2Д Сцена', 4.5),
  ('3Д Сцена', 7.5),
  ('Полет группами', 14.5),
  ('Симуляция', 10.0),
  ('Рендер', 8.0),
  ('Композитинг', 6.0)
ON CONFLICT (name) DO NOTHING;

-- rework_coefs
INSERT INTO rework_coefs (status, value) VALUES
  ('ДА', 1.5),
  ('НЕТ', 1.0)
ON CONFLICT (status) DO NOTHING;

-- period_configs
INSERT INTO period_configs (period_name, norm_points, company_profit_coef_q1) VALUES
  ('Q1 2026', 500, 0.3)
ON CONFLICT (period_name) DO NOTHING;


-- ========== 017_project_management.sql ==========
-- =============================================================================
-- 017_project_management.sql — Clients, sellers, workflow status, deadlines, milestones
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clients (reusable across projects)
-- -----------------------------------------------------------------------------
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_name ON clients(name);

-- -----------------------------------------------------------------------------
-- Sellers (who sold the show, can be multiple per project)
-- -----------------------------------------------------------------------------
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sellers_name ON sellers(name);

-- -----------------------------------------------------------------------------
-- Project workflow status (separate from Active/Archived)
-- -----------------------------------------------------------------------------
CREATE TYPE project_workflow_status AS ENUM (
  'preview',           -- ПРЕВЬЮ
  'preproduction',     -- ПРЕПРОДАКШН
  'assembly',          -- СБОРКА
  'final_stretch',     -- ФИНИШНАЯ ПРЯМАЯ
  'show',              -- ШОУ
  'stop',              -- СТОП
  'awaiting_response'  -- ЖДЕМ ОТВЕТА
);

-- -----------------------------------------------------------------------------
-- Add new columns to projects
-- -----------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN workflow_status project_workflow_status,
  ADD COLUMN global_deadline DATE,
  ADD COLUMN pitch_deadline DATE;

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_workflow_status ON projects(workflow_status);
CREATE INDEX idx_projects_global_deadline ON projects(global_deadline);
CREATE INDEX idx_projects_pitch_deadline ON projects(pitch_deadline);

-- -----------------------------------------------------------------------------
-- Project-Sellers junction (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE project_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, seller_id)
);

CREATE INDEX idx_project_sellers_project ON project_sellers(project_id);
CREATE INDEX idx_project_sellers_seller ON project_sellers(seller_id);

-- -----------------------------------------------------------------------------
-- Project milestones (created when pitch_deadline changes)
-- -----------------------------------------------------------------------------
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pitch_date DATE NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_project_milestones_pitch_date ON project_milestones(pitch_date);

-- -----------------------------------------------------------------------------
-- Optional: link work_logs to milestone (for tracking which version)
-- -----------------------------------------------------------------------------
ALTER TABLE work_logs
  ADD COLUMN milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL;

CREATE INDEX idx_work_logs_milestone ON work_logs(milestone_id);

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY sellers_select ON sellers FOR SELECT TO authenticated USING (true);
CREATE POLICY sellers_insert ON sellers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sellers_update ON sellers FOR UPDATE TO authenticated USING (true);

CREATE POLICY project_sellers_select ON project_sellers FOR SELECT TO authenticated USING (true);
CREATE POLICY project_sellers_insert ON project_sellers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY project_sellers_delete ON project_sellers FOR DELETE TO authenticated USING (true);

CREATE POLICY project_milestones_select ON project_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY project_milestones_insert ON project_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY project_milestones_update ON project_milestones FOR UPDATE TO authenticated USING (true);
CREATE POLICY project_milestones_delete ON project_milestones FOR DELETE TO authenticated USING (true);

