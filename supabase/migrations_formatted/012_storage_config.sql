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
