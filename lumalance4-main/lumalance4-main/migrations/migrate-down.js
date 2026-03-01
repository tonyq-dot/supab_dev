require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/database/connection');

// Function to revert the last migration
async function revertLastMigration() {
  const client = await pool.connect();
  
  try {
    // Check if migrations table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('No migrations table found. Nothing to revert.');
      return;
    }
    
    // Get the last applied migration
    const { rows } = await client.query(`
      SELECT name FROM migrations 
      ORDER BY applied_at DESC 
      LIMIT 1
    `);
    
    if (rows.length === 0) {
      console.log('No migrations have been applied. Nothing to revert.');
      return;
    }
    
    const lastMigration = rows[0].name;
    console.log(`Reverting migration: ${lastMigration}`);
    
    // Import and run the down function
    const migration = require(path.join(__dirname, lastMigration));
    
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${lastMigration} does not have a down function`);
    }
    
    await migration.down(client);
    
    // Remove the migration record
    await client.query(
      'DELETE FROM migrations WHERE name = $1',
      [lastMigration]
    );
    
    console.log(`Migration reverted: ${lastMigration}`);
  } catch (error) {
    console.error('Migration revert error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the revert and exit
revertLastMigration()
  .then(() => {
    console.log('Migration revert process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration revert process failed:', error);
    process.exit(1);
  });
