-- =============================================================================
-- Project Management: clients, sellers, workflow status, deadlines, milestones
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clients (reusable across projects)
-- -----------------------------------------------------------------------------
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_name ON clients(name);

-- -----------------------------------------------------------------------------
-- Sellers (who sold the show, can be multiple per project)
-- -----------------------------------------------------------------------------
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sellers_name ON sellers(name);

-- -----------------------------------------------------------------------------
-- Project workflow status (separate from Active/Archived)
-- -----------------------------------------------------------------------------
CREATE TYPE project_workflow_status AS ENUM (
  'preview',           -- ПРЕВЬЮ
  'preproduction',     -- ПРЕПРОДАКШН
  'assembly',      -- СБОРКА
  'final_stretch',     -- ФИНИШНАЯ ПРЯМАЯ
  'show',              -- ШОУ
  'stop',              -- СТОП
  'awaiting_response'  -- ЖДЕМ ОТВЕТА
);

-- -----------------------------------------------------------------------------
-- Add new columns to projects
-- -----------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN workflow_status project_workflow_status,
  ADD COLUMN global_deadline DATE,
  ADD COLUMN pitch_deadline DATE;

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_workflow_status ON projects(workflow_status);
CREATE INDEX idx_projects_global_deadline ON projects(global_deadline);
CREATE INDEX idx_projects_pitch_deadline ON projects(pitch_deadline);

-- -----------------------------------------------------------------------------
-- Project-Sellers junction (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE project_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, seller_id)
);

CREATE INDEX idx_project_sellers_project ON project_sellers(project_id);
CREATE INDEX idx_project_sellers_seller ON project_sellers(seller_id);

-- -----------------------------------------------------------------------------
-- Project milestones (created when pitch_deadline changes)
-- -----------------------------------------------------------------------------
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pitch_date DATE NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_project_milestones_pitch_date ON project_milestones(pitch_date);

-- -----------------------------------------------------------------------------
-- Optional: link work_logs to milestone (for tracking which version)
-- -----------------------------------------------------------------------------
ALTER TABLE work_logs
  ADD COLUMN milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL;

CREATE INDEX idx_work_logs_milestone ON work_logs(milestone_id);

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY sellers_select ON sellers FOR SELECT TO authenticated USING (true);
CREATE POLICY sellers_insert ON sellers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sellers_update ON sellers FOR UPDATE TO authenticated USING (true);

CREATE POLICY project_sellers_select ON project_sellers FOR SELECT TO authenticated USING (true);
CREATE POLICY project_sellers_insert ON project_sellers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY project_sellers_delete ON project_sellers FOR DELETE TO authenticated USING (true);

CREATE POLICY project_milestones_select ON project_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY project_milestones_insert ON project_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY project_milestones_update ON project_milestones FOR UPDATE TO authenticated USING (true);
CREATE POLICY project_milestones_delete ON project_milestones FOR DELETE TO authenticated USING (true);
