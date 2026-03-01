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
