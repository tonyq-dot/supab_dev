/**
 * Migration: 007_whiteboard_system.js
 * 
 * This migration adds tables for the whiteboard system:
 * - whiteboards: Main whiteboard entities
 * - whiteboard_collaborators: Sharing permissions
 * - whiteboard_project_elements: Project elements on whiteboards
 */

const up = async (client) => {
  // Create whiteboards table
  await client.query(`
    CREATE TABLE whiteboards (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      excalidraw_data JSONB NOT NULL DEFAULT '{}',
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create whiteboard collaborators table
  await client.query(`
    CREATE TABLE whiteboard_collaborators (
      id SERIAL PRIMARY KEY,
      whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_level VARCHAR(50) NOT NULL DEFAULT 'view',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(whiteboard_id, user_id)
    )
  `);

  // Create whiteboard project elements table
  await client.query(`
    CREATE TABLE whiteboard_project_elements (
      id SERIAL PRIMARY KEY,
      whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      excalidraw_element_id VARCHAR(255) NOT NULL,
      position_x FLOAT NOT NULL,
      position_y FLOAT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(whiteboard_id, excalidraw_element_id)
    )
  `);

  // Create indexes for performance
  await client.query(`
    CREATE INDEX idx_whiteboards_owner_id ON whiteboards(owner_id)
  `);

  await client.query(`
    CREATE INDEX idx_whiteboard_collaborators_whiteboard_id ON whiteboard_collaborators(whiteboard_id)
  `);

  await client.query(`
    CREATE INDEX idx_whiteboard_project_elements_whiteboard_id ON whiteboard_project_elements(whiteboard_id)
  `);

  await client.query(`
    CREATE INDEX idx_whiteboard_project_elements_project_id ON whiteboard_project_elements(project_id)
  `);

  // Create trigger to update whiteboards updated_at
  await client.query(`
    CREATE TRIGGER update_whiteboards_updated_at
    BEFORE UPDATE ON whiteboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create trigger to update whiteboard_collaborators updated_at
  await client.query(`
    CREATE TRIGGER update_whiteboard_collaborators_updated_at
    BEFORE UPDATE ON whiteboard_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create trigger to update whiteboard_project_elements updated_at
  await client.query(`
    CREATE TRIGGER update_whiteboard_project_elements_updated_at
    BEFORE UPDATE ON whiteboard_project_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);
};

const down = async (client) => {
  // Drop tables in reverse order
  await client.query(`DROP TABLE IF EXISTS whiteboard_project_elements`);
  await client.query(`DROP TABLE IF EXISTS whiteboard_collaborators`);
  await client.query(`DROP TABLE IF EXISTS whiteboards`);
};

module.exports = { up, down }; 