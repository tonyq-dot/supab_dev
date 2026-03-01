-- Gallery: tags, media_items, media_tags, video_comments
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

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

CREATE INDEX idx_media_items_uploaded_by ON media_items(uploaded_by);
CREATE INDEX idx_media_items_work_log_id ON media_items(work_log_id);
CREATE INDEX idx_media_tags_media_id ON media_tags(media_id);
CREATE INDEX idx_video_comments_media_id ON video_comments(media_id);

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
CREATE POLICY media_items_update ON media_items FOR UPDATE USING (uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
CREATE POLICY media_items_delete ON media_items FOR DELETE USING (uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

CREATE POLICY media_tags_select ON media_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY media_tags_all ON media_tags FOR ALL TO authenticated USING (true);

CREATE POLICY video_comments_select ON video_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY video_comments_insert ON video_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY video_comments_update ON video_comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY video_comments_delete ON video_comments FOR DELETE USING (author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));
