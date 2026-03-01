/**
 * Migration: 009_points_system.js
 * 
 * This migration adds tables for a lightweight crypto-like points system:
 * - user_points: Tracks user point balances
 * - point_transactions: Tracks all point transactions (minting, transfers, etc.)
 * - point_achievements: Defines achievement types and point rewards
 * - user_achievements: Tracks user achievements
 */

const up = async (client) => {
  // Create user_points table
  await client.query(`
    CREATE TABLE user_points (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance DECIMAL(20,8) NOT NULL DEFAULT 0,
      total_earned DECIMAL(20,8) NOT NULL DEFAULT 0,
      total_spent DECIMAL(20,8) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);

  // Create point_transactions table (like blockchain transactions)
  await client.query(`
    CREATE TABLE point_transactions (
      id SERIAL PRIMARY KEY,
      transaction_hash VARCHAR(64) UNIQUE NOT NULL,
      from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount DECIMAL(20,8) NOT NULL,
      transaction_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
      block_number INTEGER,
      reference_id INTEGER, -- milestone_id, achievement_id, etc.
      reference_type VARCHAR(50), -- 'milestone', 'achievement', 'transfer', etc.
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create point_achievements table
  await client.query(`
    CREATE TABLE point_achievements (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      points_reward DECIMAL(20,8) NOT NULL,
      achievement_type VARCHAR(50) NOT NULL,
      criteria JSONB, -- conditions to unlock
      icon VARCHAR(100),
      rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create user_achievements table
  await client.query(`
    CREATE TABLE user_achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id INTEGER NOT NULL REFERENCES point_achievements(id) ON DELETE CASCADE,
      earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      transaction_hash VARCHAR(64) REFERENCES point_transactions(transaction_hash),
      UNIQUE(user_id, achievement_id)
    )
  `);

  // Create indexes for faster queries
  await client.query(`
    CREATE INDEX idx_user_points_user_id ON user_points(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_point_transactions_from_user ON point_transactions(from_user_id)
  `);

  await client.query(`
    CREATE INDEX idx_point_transactions_to_user ON point_transactions(to_user_id)
  `);

  await client.query(`
    CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type)
  `);

  await client.query(`
    CREATE INDEX idx_point_transactions_hash ON point_transactions(transaction_hash)
  `);

  await client.query(`
    CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id)
  `);

  // Create trigger to update user_points updated_at
  await client.query(`
    CREATE TRIGGER update_user_points_updated_at
    BEFORE UPDATE ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create function to generate transaction hash
  await client.query(`
    CREATE OR REPLACE FUNCTION generate_transaction_hash()
    RETURNS VARCHAR(64) AS $$
    BEGIN
      RETURN encode(gen_random_bytes(32), 'hex');
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to mint points (like mining)
  await client.query(`
    CREATE OR REPLACE FUNCTION mint_points(
      p_user_id INTEGER,
      p_amount DECIMAL(20,8),
      p_transaction_type VARCHAR(50),
      p_reference_id INTEGER DEFAULT NULL,
      p_reference_type VARCHAR(50) DEFAULT NULL,
      p_metadata JSONB DEFAULT NULL
    )
    RETURNS VARCHAR(64) AS $$
    DECLARE
      v_transaction_hash VARCHAR(64);
      v_current_balance DECIMAL(20,8);
    BEGIN
      -- Generate unique transaction hash
      v_transaction_hash := generate_transaction_hash();
      
      -- Insert transaction record
      INSERT INTO point_transactions (
        transaction_hash,
        to_user_id,
        amount,
        transaction_type,
        reference_id,
        reference_type,
        metadata
      ) VALUES (
        v_transaction_hash,
        p_user_id,
        p_amount,
        p_transaction_type,
        p_reference_id,
        p_reference_type,
        p_metadata
      );
      
      -- Update or create user points record
      INSERT INTO user_points (user_id, balance, total_earned)
      VALUES (p_user_id, p_amount, p_amount)
      ON CONFLICT (user_id) DO UPDATE SET
        balance = user_points.balance + p_amount,
        total_earned = user_points.total_earned + p_amount,
        updated_at = CURRENT_TIMESTAMP;
      
      RETURN v_transaction_hash;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to transfer points between users
  await client.query(`
    CREATE OR REPLACE FUNCTION transfer_points(
      p_from_user_id INTEGER,
      p_to_user_id INTEGER,
      p_amount DECIMAL(20,8),
      p_metadata JSONB DEFAULT NULL
    )
    RETURNS VARCHAR(64) AS $$
    DECLARE
      v_transaction_hash VARCHAR(64);
      v_from_balance DECIMAL(20,8);
    BEGIN
      -- Check if sender has enough balance
      SELECT balance INTO v_from_balance
      FROM user_points
      WHERE user_id = p_from_user_id;
      
      IF v_from_balance IS NULL OR v_from_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
      END IF;
      
      -- Generate unique transaction hash
      v_transaction_hash := generate_transaction_hash();
      
      -- Insert transaction record
      INSERT INTO point_transactions (
        transaction_hash,
        from_user_id,
        to_user_id,
        amount,
        transaction_type,
        metadata
      ) VALUES (
        v_transaction_hash,
        p_from_user_id,
        p_to_user_id,
        p_amount,
        'transfer',
        p_metadata
      );
      
      -- Update sender balance
      UPDATE user_points SET
        balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = p_from_user_id;
      
      -- Update receiver balance
      INSERT INTO user_points (user_id, balance, total_earned)
      VALUES (p_to_user_id, p_amount, p_amount)
      ON CONFLICT (user_id) DO UPDATE SET
        balance = user_points.balance + p_amount,
        total_earned = user_points.total_earned + p_amount,
        updated_at = CURRENT_TIMESTAMP;
      
      RETURN v_transaction_hash;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Insert default achievements
  await client.query(`
    INSERT INTO point_achievements (name, description, points_reward, achievement_type, criteria, icon, rarity) VALUES
    ('First Milestone', 'Complete your first milestone', 100, 'milestone_completion', '{"milestone_count": 1}', '🎯', 'common'),
    ('Milestone Master', 'Complete 10 milestones', 500, 'milestone_completion', '{"milestone_count": 10}', '🏆', 'rare'),
    ('Project Champion', 'Complete 50 milestones', 2000, 'milestone_completion', '{"milestone_count": 50}', '👑', 'epic'),
    ('Earning Legend', 'Earn $1000 through completed milestones', 1000, 'earnings', '{"total_earnings": 1000}', '💰', 'rare'),
    ('Client Favorite', 'Receive 5 positive reviews', 300, 'reviews', '{"positive_reviews": 5}', '⭐', 'rare'),
    ('Quick Worker', 'Complete a milestone within 24 hours', 200, 'speed', '{"completion_time_hours": 24}', '⚡', 'common'),
    ('Reliable Partner', 'Complete 5 milestones on time', 400, 'reliability', '{"on_time_completions": 5}', '⏰', 'rare'),
    ('Communication Pro', 'Send 100 messages', 150, 'communication', '{"message_count": 100}', '💬', 'common'),
    ('Profile Complete', 'Complete your profile with all information', 50, 'profile', '{"profile_complete": true}', '📝', 'common'),
    ('Early Adopter', 'Join the platform in the first month', 1000, 'special', '{"join_date_before": "2024-02-01"}', '🚀', 'legendary')
  `);

  console.log('Migration 009_points_system: UP completed successfully');
};

const down = async (client) => {
  // Drop functions
  await client.query(`DROP FUNCTION IF EXISTS transfer_points(INTEGER, INTEGER, DECIMAL, JSONB)`);
  await client.query(`DROP FUNCTION IF EXISTS mint_points(INTEGER, DECIMAL, VARCHAR, INTEGER, VARCHAR, JSONB)`);
  await client.query(`DROP FUNCTION IF EXISTS generate_transaction_hash()`);
  
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points`);
  
  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_user_achievements_achievement_id`);
  await client.query(`DROP INDEX IF EXISTS idx_user_achievements_user_id`);
  await client.query(`DROP INDEX IF EXISTS idx_point_transactions_hash`);
  await client.query(`DROP INDEX IF EXISTS idx_point_transactions_type`);
  await client.query(`DROP INDEX IF EXISTS idx_point_transactions_to_user`);
  await client.query(`DROP INDEX IF EXISTS idx_point_transactions_from_user`);
  await client.query(`DROP INDEX IF EXISTS idx_user_points_user_id`);
  
  // Drop tables
  await client.query(`DROP TABLE IF EXISTS user_achievements`);
  await client.query(`DROP TABLE IF EXISTS point_achievements`);
  await client.query(`DROP TABLE IF EXISTS point_transactions`);
  await client.query(`DROP TABLE IF EXISTS user_points`);

  console.log('Migration 009_points_system: DOWN completed successfully');
};

module.exports = { up, down }; 