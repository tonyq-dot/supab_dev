/**
 * Migration: 007_notifications.js
 * 
 * This migration adds tables for the notification system:
 * - notifications: Stores in-app notifications for users
 */

const up = async (client) => {
  // Create notifications table
  await client.query(`
    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      related_type VARCHAR(50),
      related_id INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for faster notification retrieval
  await client.query(`
    CREATE INDEX idx_notifications_user_id ON notifications(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)
  `);

  await client.query(`
    CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC)
  `);

  // Create trigger to update notifications updated_at
  await client.query(`
    CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  console.log('Migration 007_notifications: UP completed successfully');
};

const down = async (client) => {
  // Drop trigger
  await client.query(`DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications`);
  
  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_notifications_created_at`);
  await client.query(`DROP INDEX IF EXISTS idx_notifications_user_read`);
  await client.query(`DROP INDEX IF EXISTS idx_notifications_user_id`);
  
  // Drop table
  await client.query(`DROP TABLE IF EXISTS notifications`);

  console.log('Migration 007_notifications: DOWN completed successfully');
};

module.exports = { up, down }; 