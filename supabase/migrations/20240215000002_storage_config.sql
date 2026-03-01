-- Storage backend configuration for flexible file storage (local/supabase/s3)
CREATE TABLE storage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backend TEXT NOT NULL CHECK (backend IN ('local', 'supabase', 's3')),
  base_path TEXT NOT NULL DEFAULT 'gallery',
  s3_bucket TEXT,
  s3_region TEXT,
  is_default BOOLEAN DEFAULT true
);

INSERT INTO storage_config (backend, base_path, is_default) VALUES ('supabase', 'gallery-media', true);

ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY storage_config_select ON storage_config FOR SELECT TO authenticated USING (true);
