/**
 * Core schema migration
 * Creates the basic tables for users, authentication, and profiles
 */

exports.up = async (client) => {
  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create profiles table
  await client.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      display_name VARCHAR(100),
      bio TEXT,
      avatar_url VARCHAR(255),
      location VARCHAR(100),
      website VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create telegram_auth table for Telegram authentication
  await client.query(`
    CREATE TABLE IF NOT EXISTS telegram_auth (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      telegram_id VARCHAR(100) UNIQUE NOT NULL,
      telegram_username VARCHAR(100),
      telegram_first_name VARCHAR(100),
      telegram_last_name VARCHAR(100),
      telegram_photo_url VARCHAR(255),
      auth_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create refresh_tokens table
  await client.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create password_reset table
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create updated_at trigger function
  await client.query(`
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Add triggers for updated_at
  await client.query(`
    CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  await client.query(`
    CREATE TRIGGER update_telegram_auth_modtime
    BEFORE UPDATE ON telegram_auth
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);

  console.log('Core schema migration completed');
};

exports.down = async (client) => {
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_users_modtime ON users;`);
  await client.query(`DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;`);
  await client.query(`DROP TRIGGER IF EXISTS update_telegram_auth_modtime ON telegram_auth;`);

  // Drop trigger function
  await client.query(`DROP FUNCTION IF EXISTS update_modified_column;`);

  // Drop tables
  await client.query(`DROP TABLE IF EXISTS password_reset;`);
  await client.query(`DROP TABLE IF EXISTS refresh_tokens;`);
  await client.query(`DROP TABLE IF EXISTS telegram_auth;`);
  await client.query(`DROP TABLE IF EXISTS profiles;`);
  await client.query(`DROP TABLE IF EXISTS users;`);

  console.log('Core schema migration reverted');
};
