/**
 * Migration: 004_milestone_system.js
 * 
 * This migration adds tables for the milestone system:
 * - milestones: Represents project milestones with payment amounts
 * - project_status_history: Tracks project status changes
 */

const up = async (client) => {
  // Create milestones table
  await client.query(`
    CREATE TABLE milestones (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      amount DECIMAL(10,2) NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create project status history table
  await client.query(`
    CREATE TABLE project_status_history (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      previous_status VARCHAR(50) NOT NULL,
      new_status VARCHAR(50) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster milestone retrieval
  await client.query(`
    CREATE INDEX idx_milestones_project_id ON milestones(project_id)
  `);

  // Create index for faster project status history retrieval
  await client.query(`
    CREATE INDEX idx_project_status_history_project_id ON project_status_history(project_id)
  `);

  // Create trigger to update milestones updated_at
  await client.query(`
    CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create trigger to update project status when all milestones are completed
  await client.query(`
    CREATE OR REPLACE FUNCTION check_all_milestones_completed()
    RETURNS TRIGGER AS $$
    DECLARE
      all_completed BOOLEAN;
      project_current_status VARCHAR(50);
    BEGIN
      -- Check if all milestones for the project are completed
      SELECT 
        CASE WHEN COUNT(*) = COUNT(CASE WHEN status = 'completed' THEN 1 END) THEN TRUE ELSE FALSE END,
        p.status INTO all_completed, project_current_status
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.project_id = NEW.project_id
      GROUP BY p.status;
      
      -- If all milestones are completed and project is not already completed, update project status
      IF all_completed = TRUE AND project_current_status = 'in-progress' THEN
        -- Insert into project status history
        INSERT INTO project_status_history (
          project_id, previous_status, new_status, changed_by, notes
        ) VALUES (
          NEW.project_id, 
          project_current_status, 
          'completed', 
          NEW.created_by, 
          'Automatically marked as completed when all milestones were completed'
        );
        
        -- Update project status
        UPDATE projects
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to check if all milestones are completed when a milestone is updated
  await client.query(`
    CREATE TRIGGER check_project_milestones_completed
    AFTER UPDATE OF status ON milestones
    FOR EACH ROW
    WHEN (OLD.status <> 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION check_all_milestones_completed()
  `);

  console.log('Migration 004_milestone_system: UP completed successfully');
};

const down = async (client) => {
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS check_project_milestones_completed ON milestones`);
  await client.query(`DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones`);
  
  // Drop functions
  await client.query(`DROP FUNCTION IF EXISTS check_all_milestones_completed()`);
  
  // Drop tables
  await client.query(`DROP TABLE IF EXISTS project_status_history`);
  await client.query(`DROP TABLE IF EXISTS milestones`);

  console.log('Migration 004_milestone_system: DOWN completed successfully');
};

module.exports = {
  up,
  down
};
