-- KPI System: Create schema and tables
-- Phase 0: Dictionaries and operational tables

-- Project status enum
CREATE TYPE project_status AS ENUM ('Active', 'Archived');

-- 1. Dictionaries
CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  value NUMERIC(4,2) NOT NULL,
  description TEXT
);

CREATE TABLE drone_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_drones INTEGER NOT NULL,
  max_drones INTEGER NOT NULL,
  coefficient NUMERIC(4,2) NOT NULL,
  UNIQUE(min_drones, max_drones)
);

CREATE TABLE work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_value NUMERIC(6,2) NOT NULL
);

CREATE TABLE rework_coefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  value NUMERIC(4,2) NOT NULL
);

-- 2. Operational tables
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES project_types(id),
  drone_count INTEGER NOT NULL,
  is_rework BOOLEAN NOT NULL DEFAULT FALSE,
  status project_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  work_type_id UUID NOT NULL REFERENCES work_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE period_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL UNIQUE,
  norm_points INTEGER NOT NULL DEFAULT 500,
  company_profit_coef_q1 NUMERIC(4,2) NOT NULL DEFAULT 0.3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles for RLS (animator vs manager)
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('animator', 'manager'))
);

-- User salaries for bonus calculation (manager-only access)
CREATE TABLE user_salaries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(12,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX idx_work_logs_date ON work_logs(date);
CREATE INDEX idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX idx_projects_status ON projects(status);
