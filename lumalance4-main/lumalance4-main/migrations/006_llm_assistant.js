/**
 * Migration: 006_llm_assistant.js
 * Description: Sets up the database schema for the LLM assistant module using pg client
 */

const up = async (client) => {
  // Enable pgvector extension
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');

  // Create project_embeddings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_embeddings (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      embedding vector(1536),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS project_embeddings_project_id_idx ON project_embeddings(project_id)');
  await client.query('CREATE INDEX IF NOT EXISTS project_embeddings_idx ON project_embeddings USING ivfflat (embedding vector_cosine_ops)');

  // Create milestone_embeddings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS milestone_embeddings (
      id SERIAL PRIMARY KEY,
      milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      embedding vector(1536),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS milestone_embeddings_milestone_id_idx ON milestone_embeddings(milestone_id)');
  await client.query('CREATE INDEX IF NOT EXISTS milestone_embeddings_idx ON milestone_embeddings USING ivfflat (embedding vector_cosine_ops)');

  // Create user_embeddings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_embeddings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      embedding vector(1536),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS user_embeddings_user_id_idx ON user_embeddings(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS user_embeddings_idx ON user_embeddings USING ivfflat (embedding vector_cosine_ops)');

  // Create llm_interactions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS llm_interactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      context JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS llm_interactions_user_id_idx ON llm_interactions(user_id)');

  console.log('Migration 006_llm_assistant: UP completed successfully');
};

const down = async (client) => {
  // Drop indexes first
  await client.query('DROP INDEX IF EXISTS project_embeddings_idx');
  await client.query('DROP INDEX IF EXISTS milestone_embeddings_idx');
  await client.query('DROP INDEX IF EXISTS user_embeddings_idx');
  await client.query('DROP INDEX IF EXISTS llm_interactions_user_id_idx');
  await client.query('DROP INDEX IF EXISTS project_embeddings_project_id_idx');
  await client.query('DROP INDEX IF EXISTS milestone_embeddings_milestone_id_idx');
  await client.query('DROP INDEX IF EXISTS user_embeddings_user_id_idx');

  // Drop tables
  await client.query('DROP TABLE IF EXISTS llm_interactions');
  await client.query('DROP TABLE IF EXISTS user_embeddings');
  await client.query('DROP TABLE IF EXISTS milestone_embeddings');
  await client.query('DROP TABLE IF EXISTS project_embeddings');

  // Note: We do not drop the vector extension
  console.log('Migration 006_llm_assistant: DOWN completed successfully');
};

module.exports = { up, down };
