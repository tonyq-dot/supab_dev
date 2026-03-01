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
