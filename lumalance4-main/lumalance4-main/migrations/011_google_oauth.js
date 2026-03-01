/**
 * Migration: 011_google_oauth.js
 * 
 * This migration adds Google OAuth support to the users table
 */

const up = async (client) => {
  // Add google_id column to users table
  await client.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE
  `);

  // Add index for faster Google ID lookups
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
  `);

  // Add comment to document the column
  await client.query(`
    COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID for authentication'
  `);

  console.log('Migration 011_google_oauth: UP completed successfully');
};

const down = async (client) => {
  // Drop index
  await client.query(`
    DROP INDEX IF EXISTS idx_users_google_id
  `);

  // Drop column
  await client.query(`
    ALTER TABLE users DROP COLUMN IF EXISTS google_id
  `);

  console.log('Migration 011_google_oauth: DOWN completed successfully');
};

module.exports = { up, down }; 