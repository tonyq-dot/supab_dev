/**
 * Migration: 008_payment_system.js
 * 
 * This migration adds tables for the payment tracking system:
 * - payments: Tracks milestone payments
 * - payment_methods: Stores user payment methods
 * - payment_history: Tracks payment status changes
 */

const up = async (client) => {
  // Create payment_methods table
  await client.query(`
    CREATE TABLE payment_methods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
      name VARCHAR(255) NOT NULL,
      details JSONB,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create payments table
  await client.query(`
    CREATE TABLE payments (
      id SERIAL PRIMARY KEY,
      milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      payer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
      transaction_id VARCHAR(255),
      notes TEXT,
      paid_at TIMESTAMP WITH TIME ZONE,
      due_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create payment_history table
  await client.query(`
    CREATE TABLE payment_history (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      previous_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for faster queries
  await client.query(`
    CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id)
  `);

  await client.query(`
    CREATE INDEX idx_payments_milestone_id ON payments(milestone_id)
  `);

  await client.query(`
    CREATE INDEX idx_payments_payer_id ON payments(payer_id)
  `);

  await client.query(`
    CREATE INDEX idx_payments_payee_id ON payments(payee_id)
  `);

  await client.query(`
    CREATE INDEX idx_payments_status ON payments(status)
  `);

  await client.query(`
    CREATE INDEX idx_payment_history_payment_id ON payment_history(payment_id)
  `);

  // Create trigger to update payment_methods updated_at
  await client.query(`
    CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create trigger to update payments updated_at
  await client.query(`
    CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `);

  // Create trigger to automatically create payment when milestone is created
  await client.query(`
    CREATE OR REPLACE FUNCTION create_payment_for_milestone()
    RETURNS TRIGGER AS $$
    DECLARE
      project_client_id INTEGER;
      project_freelancer_id INTEGER;
    BEGIN
      -- Get project participants
      SELECT p.client_id, pa.freelancer_id 
      INTO project_client_id, project_freelancer_id
      FROM projects p
      LEFT JOIN project_assignments pa ON p.id = pa.project_id
      WHERE p.id = NEW.project_id;
      
      -- Create payment record
      INSERT INTO payments (
        milestone_id, 
        payer_id, 
        payee_id, 
        amount, 
        due_date,
        status
      ) VALUES (
        NEW.id,
        project_client_id,
        project_freelancer_id,
        NEW.amount,
        NEW.due_date,
        'pending'
      );
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to create payment when milestone is created
  await client.query(`
    CREATE TRIGGER create_payment_on_milestone_creation
    AFTER INSERT ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_for_milestone()
  `);

  // Create trigger to update payment status when milestone is completed
  await client.query(`
    CREATE OR REPLACE FUNCTION update_payment_on_milestone_completion()
    RETURNS TRIGGER AS $$
    BEGIN
      -- If milestone is completed, mark payment as due
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE payments 
        SET status = 'due', updated_at = CURRENT_TIMESTAMP
        WHERE milestone_id = NEW.id AND status = 'pending';
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to update payment when milestone status changes
  await client.query(`
    CREATE TRIGGER update_payment_on_milestone_status_change
    AFTER UPDATE OF status ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_on_milestone_completion()
  `);

  console.log('Migration 008_payment_system: UP completed successfully');
};

const down = async (client) => {
  // Drop triggers
  await client.query(`DROP TRIGGER IF EXISTS update_payment_on_milestone_status_change ON milestones`);
  await client.query(`DROP TRIGGER IF EXISTS create_payment_on_milestone_creation ON milestones`);
  await client.query(`DROP TRIGGER IF EXISTS update_payments_updated_at ON payments`);
  await client.query(`DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods`);
  
  // Drop functions
  await client.query(`DROP FUNCTION IF EXISTS update_payment_on_milestone_completion()`);
  await client.query(`DROP FUNCTION IF EXISTS create_payment_for_milestone()`);
  
  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_payment_history_payment_id`);
  await client.query(`DROP INDEX IF EXISTS idx_payments_status`);
  await client.query(`DROP INDEX IF EXISTS idx_payments_payee_id`);
  await client.query(`DROP INDEX IF EXISTS idx_payments_payer_id`);
  await client.query(`DROP INDEX IF EXISTS idx_payments_milestone_id`);
  await client.query(`DROP INDEX IF EXISTS idx_payment_methods_user_id`);
  
  // Drop tables
  await client.query(`DROP TABLE IF EXISTS payment_history`);
  await client.query(`DROP TABLE IF EXISTS payments`);
  await client.query(`DROP TABLE IF EXISTS payment_methods`);

  console.log('Migration 008_payment_system: DOWN completed successfully');
};

module.exports = { up, down }; 