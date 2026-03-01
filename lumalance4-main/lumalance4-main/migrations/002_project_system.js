/**
 * Project system migration
 * Creates tables for projects, categories, skills, and related entities
 */

exports.up = async (client) => {
  // Create categories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create skills table
  await client.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create user_skills table (many-to-many)
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, skill_id)
    );
  `);

  // Create projects table
  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      budget DECIMAL(10, 2),
      deadline TIMESTAMP,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      is_public BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES users(id)
    );
  `);

  // Create project_categories table (many-to-many)
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_categories (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, category_id)
    );
  `);

  // Create project_skills table (many-to-many)
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_skills (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, skill_id)
    );
  `);

  // Create proposals table
  await client.query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      freelancer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cover_letter TEXT,
      price DECIMAL(10, 2),
      estimated_duration INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, freelancer_id),
      CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id),
      CONSTRAINT fk_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id)
    );
  `);

  // Create project_assignments table
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      freelancer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposal_id INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      start_date TIMESTAMP NOT NULL DEFAULT NOW(),
      end_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, freelancer_id),
      CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id),
      CONSTRAINT fk_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id),
      CONSTRAINT fk_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
  `);

  // Create milestones table
  await client.query(`
    CREATE TABLE IF NOT EXISTS milestones (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      amount DECIMAL(10, 2),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id)
    );
  `);

  // Add triggers for updated_at
  await client.query(`
    CREATE TRIGGER update_categories_modtime
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_skills_modtime
    BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_user_skills_modtime
    BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_proposals_modtime
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_project_assignments_modtime
    BEFORE UPDATE ON project_assignments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_milestones_modtime
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  console.log('Project system migration completed');
};

exports.down = async (client) => {
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_categories_modtime ON categories;`);
  await client.query(`DROP TRIGGER IF EXISTS update_skills_modtime ON skills;`);
  await client.query(`DROP TRIGGER IF EXISTS update_user_skills_modtime ON user_skills;`);
  await client.query(`DROP TRIGGER IF EXISTS update_projects_modtime ON projects;`);
  await client.query(`DROP TRIGGER IF EXISTS update_proposals_modtime ON proposals;`);
  await client.query(`DROP TRIGGER IF EXISTS update_project_assignments_modtime ON project_assignments;`);
  await client.query(`DROP TRIGGER IF EXISTS update_milestones_modtime ON milestones;`);

  // Drop tables
  await client.query(`DROP TABLE IF EXISTS milestones;`);
  await client.query(`DROP TABLE IF EXISTS project_assignments;`);
  await client.query(`DROP TABLE IF EXISTS proposals;`);
  await client.query(`DROP TABLE IF EXISTS project_skills;`);
  await client.query(`DROP TABLE IF EXISTS project_categories;`);
  await client.query(`DROP TABLE IF EXISTS projects;`);
  await client.query(`DROP TABLE IF EXISTS user_skills;`);
  await client.query(`DROP TABLE IF EXISTS skills;`);
  await client.query(`DROP TABLE IF EXISTS categories;`);

  console.log('Project system migration reverted');
};
