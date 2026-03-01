-- User profiles: display name, nickname for reports
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
