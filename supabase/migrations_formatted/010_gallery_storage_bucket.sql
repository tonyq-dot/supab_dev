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
