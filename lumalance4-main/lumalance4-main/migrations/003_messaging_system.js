/**
 * Migration: 003_messaging_system.js
 * 
 * This migration adds tables for the messaging system:
 * - conversations: Represents a conversation between users
 * - conversation_participants: Links users to conversations
 * - messages: Individual messages within conversations
 */

const up = async (client) => {
  // Create conversations table
  await client.query(`
    CREATE TABLE conversations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      is_group BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create conversation_participants table
  await client.query(`
    CREATE TABLE conversation_participants (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_admin BOOLEAN DEFAULT false,
      last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(conversation_id, user_id)
    )
  `);

  // Create messages table
  await client.query(`
    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_system_message BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster message retrieval
  await client.query(`
    CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)
  `);

  // Create index for faster participant lookup
  await client.query(`
    CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id)
  `);

  // Create function to update updated_at timestamp
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for conversations
  await client.query(`
    CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create trigger for messages
  await client.query(`
    CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create function to update conversation updated_at when a new message is added
  await client.query(`
    CREATE OR REPLACE FUNCTION update_conversation_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.conversation_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to update conversation timestamp
  await client.query(`
    CREATE TRIGGER update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();
  `);

  console.log('Migration 003_messaging_system: UP completed successfully');
};

const down = async (client) => {
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages`);
  await client.query(`DROP TRIGGER IF EXISTS update_messages_updated_at ON messages`);
  await client.query(`DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations`);
  
  // Drop functions
  await client.query(`DROP FUNCTION IF EXISTS update_conversation_timestamp()`);
  await client.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
  
  // Drop tables
  await client.query(`DROP TABLE IF EXISTS messages`);
  await client.query(`DROP TABLE IF EXISTS conversation_participants`);
  await client.query(`DROP TABLE IF EXISTS conversations`);

  console.log('Migration 003_messaging_system: DOWN completed successfully');
};

module.exports = {
  up,
  down
};
