-- Allow animators to create projects (all authenticated users can INSERT)
DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated WITH CHECK (true);
