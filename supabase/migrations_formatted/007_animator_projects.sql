-- =============================================================================
-- 007_animator_projects.sql — Allow animators to create projects
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated WITH CHECK (true);
