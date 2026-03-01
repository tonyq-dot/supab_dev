-- Publications and versioning: replace media_items with publications + publication_versions
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

CREATE INDEX idx_publications_author ON publications(author_id);
CREATE INDEX idx_publications_project ON publications(project_id);
CREATE INDEX idx_publications_work_log ON publications(work_log_id);
CREATE INDEX idx_publication_versions_publication ON publication_versions(publication_id);

-- Migrate data from media_items
INSERT INTO publications (id, author_id, project_id, work_log_id, title, source, is_published, published_url, created_at, updated_at)
SELECT
  mi.id,
  mi.uploaded_by,
  (SELECT project_id FROM work_logs WHERE id = mi.work_log_id LIMIT 1),
  mi.work_log_id,
  NULL,
  'web_ui',
  COALESCE(mi.is_published, false),
  mi.published_url,
  mi.created_at,
  mi.created_at
FROM media_items mi;

INSERT INTO publication_versions (publication_id, version_number, storage_path, storage_backend, media_type, created_by)
SELECT mi.id, 1, mi.storage_path, 'supabase', mi.media_type, mi.uploaded_by
FROM media_items mi;

-- Update FKs: media_tags and video_comments reference media_items, switch to publications
ALTER TABLE media_tags DROP CONSTRAINT IF EXISTS media_tags_media_id_fkey;
ALTER TABLE media_tags ADD CONSTRAINT media_tags_media_id_fkey
  FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE video_comments DROP CONSTRAINT IF EXISTS video_comments_media_id_fkey;
ALTER TABLE video_comments ADD CONSTRAINT video_comments_media_id_fkey
  FOREIGN KEY (media_id) REFERENCES publications(id) ON DELETE CASCADE;

-- Drop media_items
DROP TABLE media_items;

-- RLS for publications
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY publications_select_own ON publications FOR SELECT USING (author_id = auth.uid());
CREATE POLICY publications_select_manager ON publications FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
CREATE POLICY publications_insert ON publications FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY publications_update ON publications FOR UPDATE USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);
CREATE POLICY publications_delete ON publications FOR DELETE USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
);

CREATE POLICY publication_versions_select ON publication_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
);
CREATE POLICY publication_versions_insert ON publication_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND p.author_id = auth.uid())
);
CREATE POLICY publication_versions_update ON publication_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
);
CREATE POLICY publication_versions_delete ON publication_versions FOR DELETE USING (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_versions.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
);

CREATE POLICY publication_version_history_select ON publication_version_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id AND (p.author_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')))
);
CREATE POLICY publication_version_history_insert ON publication_version_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_version_history.publication_id AND p.author_id = auth.uid())
);
