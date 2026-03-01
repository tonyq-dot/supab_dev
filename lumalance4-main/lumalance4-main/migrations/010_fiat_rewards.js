/**
 * Migration: 010_fiat_rewards.js
 * 
 * This migration adds fiat money rewards system:
 * - fiat_rewards: Tracks fiat money rewards for achievements
 * - fiat_transactions: Tracks fiat money transactions
 * - reward_categories: Defines different types of rewards
 */

const up = async (client) => {
  // Create reward_categories table
  await client.query(`
    CREATE TABLE reward_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      fiat_reward DECIMAL(10,2) NOT NULL DEFAULT 0,
      points_reward DECIMAL(20,8) NOT NULL DEFAULT 0,
      category_type VARCHAR(50) NOT NULL,
      criteria JSONB,
      icon VARCHAR(100),
      rarity VARCHAR(20) DEFAULT 'common',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create fiat_rewards table
  await client.query(`
    CREATE TABLE fiat_rewards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES reward_categories(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      reference_id INTEGER, -- milestone_id, achievement_id, etc.
      reference_type VARCHAR(50), -- 'milestone', 'achievement', 'bonus', etc.
      metadata JSONB,
      paid_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create fiat_transactions table
  await client.query(`
    CREATE TABLE fiat_transactions (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(64) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      transaction_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reference_id INTEGER,
      reference_type VARCHAR(50),
      metadata JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP WITH TIME ZONE
    )
  `);

  // Create user_rewards_summary table for quick stats
  await client.query(`
    CREATE TABLE user_rewards_summary (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_fiat_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_fiat_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_fiat_pending DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_points_earned DECIMAL(20,8) NOT NULL DEFAULT 0,
      total_achievements_earned INTEGER NOT NULL DEFAULT 0,
      last_reward_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX idx_fiat_rewards_user_id ON fiat_rewards(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_fiat_rewards_status ON fiat_rewards(status)
  `);

  await client.query(`
    CREATE INDEX idx_fiat_transactions_user_id ON fiat_transactions(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_fiat_transactions_type ON fiat_transactions(transaction_type)
  `);

  await client.query(`
    CREATE INDEX idx_user_rewards_summary_user_id ON user_rewards_summary(user_id)
  `);

  // Create triggers
  await client.query(`
    CREATE TRIGGER update_fiat_rewards_updated_at
    BEFORE UPDATE ON fiat_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  await client.query(`
    CREATE TRIGGER update_user_rewards_summary_updated_at
    BEFORE UPDATE ON user_rewards_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create function to generate transaction ID
  await client.query(`
    CREATE OR REPLACE FUNCTION generate_fiat_transaction_id()
    RETURNS VARCHAR(64) AS $$
    BEGIN
      RETURN 'FIAT_' || encode(gen_random_bytes(24), 'hex');
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to award fiat reward
  await client.query(`
    CREATE OR REPLACE FUNCTION award_fiat_reward(
      p_user_id INTEGER,
      p_category_id INTEGER,
      p_reference_id INTEGER DEFAULT NULL,
      p_reference_type VARCHAR(50) DEFAULT NULL,
      p_metadata JSONB DEFAULT NULL
    )
    RETURNS INTEGER AS $$
    DECLARE
      v_reward_id INTEGER;
      v_amount DECIMAL(10,2);
      v_transaction_id VARCHAR(64);
    BEGIN
      -- Get reward amount from category
      SELECT fiat_reward INTO v_amount
      FROM reward_categories
      WHERE id = p_category_id AND is_active = true;
      
      IF v_amount IS NULL OR v_amount <= 0 THEN
        RETURN NULL;
      END IF;
      
      -- Create fiat reward record
      INSERT INTO fiat_rewards (
        user_id, category_id, amount, reference_id, reference_type, metadata
      ) VALUES (
        p_user_id, p_category_id, v_amount, p_reference_id, p_reference_type, p_metadata
      ) RETURNING id INTO v_reward_id;
      
      -- Create fiat transaction record
      v_transaction_id := generate_fiat_transaction_id();
      INSERT INTO fiat_transactions (
        transaction_id, user_id, amount, transaction_type, reference_id, reference_type, metadata
      ) VALUES (
        v_transaction_id, p_user_id, v_amount, 'reward', v_reward_id, 'fiat_reward', p_metadata
      );
      
      -- Update user rewards summary
      INSERT INTO user_rewards_summary (user_id, total_fiat_earned, total_fiat_pending, last_reward_at)
      VALUES (p_user_id, v_amount, v_amount, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        total_fiat_earned = user_rewards_summary.total_fiat_earned + v_amount,
        total_fiat_pending = user_rewards_summary.total_fiat_pending + v_amount,
        last_reward_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
      
      RETURN v_reward_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to mark fiat reward as paid
  await client.query(`
    CREATE OR REPLACE FUNCTION mark_fiat_reward_paid(
      p_reward_id INTEGER,
      p_notes TEXT DEFAULT NULL
    )
    RETURNS BOOLEAN AS $$
    DECLARE
      v_user_id INTEGER;
      v_amount DECIMAL(10,2);
    BEGIN
      -- Get reward details
      SELECT user_id, amount INTO v_user_id, v_amount
      FROM fiat_rewards
      WHERE id = p_reward_id AND status = 'pending';
      
      IF v_user_id IS NULL THEN
        RETURN FALSE;
      END IF;
      
      -- Update reward status
      UPDATE fiat_rewards SET
        status = 'paid',
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = p_reward_id;
      
      -- Update transaction status
      UPDATE fiat_transactions SET
        status = 'completed',
        processed_at = CURRENT_TIMESTAMP,
        notes = p_notes
      WHERE reference_id = p_reward_id AND reference_type = 'fiat_reward';
      
      -- Update user rewards summary
      UPDATE user_rewards_summary SET
        total_fiat_paid = total_fiat_paid + v_amount,
        total_fiat_pending = total_fiat_pending - v_amount,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = v_user_id;
      
      RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Insert default reward categories
  await client.query(`
    INSERT INTO reward_categories (name, description, fiat_reward, points_reward, category_type, criteria, icon, rarity) VALUES
    ('First Milestone', 'Complete your first milestone', 5.00, 100, 'milestone_completion', '{"milestone_count": 1}', '🎯', 'common'),
    ('Milestone Master', 'Complete 10 milestones', 25.00, 500, 'milestone_completion', '{"milestone_count": 10}', '🏆', 'rare'),
    ('Project Champion', 'Complete 50 milestones', 100.00, 2000, 'milestone_completion', '{"milestone_count": 50}', '👑', 'epic'),
    ('Earning Legend', 'Earn $1000 through completed milestones', 50.00, 1000, 'earnings', '{"total_earnings": 1000}', '💰', 'rare'),
    ('Client Favorite', 'Receive 5 positive reviews', 15.00, 300, 'reviews', '{"positive_reviews": 5}', '⭐', 'rare'),
    ('Quick Worker', 'Complete a milestone within 24 hours', 10.00, 200, 'speed', '{"completion_time_hours": 24}', '⚡', 'common'),
    ('Reliable Partner', 'Complete 5 milestones on time', 20.00, 400, 'reliability', '{"on_time_completions": 5}', '⏰', 'rare'),
    ('Communication Pro', 'Send 100 messages', 5.00, 150, 'communication', '{"message_count": 100}', '💬', 'common'),
    ('Profile Complete', 'Complete your profile with all information', 2.00, 50, 'profile', '{"profile_complete": true}', '📝', 'common'),
    ('Early Adopter', 'Join the platform in the first month', 50.00, 1000, 'special', '{"join_date_before": "2024-02-01"}', '🚀', 'legendary'),
    ('Weekly Streak', 'Complete milestones for 4 consecutive weeks', 30.00, 600, 'streak', '{"weekly_streak": 4}', '🔥', 'rare'),
    ('Quality Master', 'Receive 10 positive reviews', 40.00, 800, 'quality', '{"positive_reviews": 10}', '🌟', 'epic'),
    ('Team Player', 'Work on 5 different projects', 25.00, 500, 'diversity', '{"unique_projects": 5}', '🤝', 'rare'),
    ('Speed Demon', 'Complete 3 milestones in one day', 15.00, 300, 'speed', '{"daily_milestones": 3}', '🏃', 'rare'),
    ('Consistency King', 'Complete milestones for 30 consecutive days', 75.00, 1500, 'consistency', '{"daily_streak": 30}', '👑', 'legendary')
  `);

  console.log('Migration 010_fiat_rewards: UP completed successfully');
};

const down = async (client) => {
  // Drop functions
  await client.query(`DROP FUNCTION IF EXISTS mark_fiat_reward_paid(INTEGER, TEXT)`);
  await client.query(`DROP FUNCTION IF EXISTS award_fiat_reward(INTEGER, INTEGER, INTEGER, VARCHAR, JSONB)`);
  await client.query(`DROP FUNCTION IF EXISTS generate_fiat_transaction_id()`);
  
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_user_rewards_summary_updated_at ON user_rewards_summary`);
  await client.query(`DROP TRIGGER IF EXISTS update_fiat_rewards_updated_at ON fiat_rewards`);
  
  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_user_rewards_summary_user_id`);
  await client.query(`DROP INDEX IF EXISTS idx_fiat_transactions_type`);
  await client.query(`DROP INDEX IF EXISTS idx_fiat_transactions_user_id`);
  await client.query(`DROP INDEX IF EXISTS idx_fiat_rewards_status`);
  await client.query(`DROP INDEX IF EXISTS idx_fiat_rewards_user_id`);
  
  // Drop tables
  await client.query(`DROP TABLE IF EXISTS user_rewards_summary`);
  await client.query(`DROP TABLE IF EXISTS fiat_transactions`);
  await client.query(`DROP TABLE IF EXISTS fiat_rewards`);
  await client.query(`DROP TABLE IF EXISTS reward_categories`);

  console.log('Migration 010_fiat_rewards: DOWN completed successfully');
};

module.exports = { up, down }; 