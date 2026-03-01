/**
 * Telegram Bot Test Script
 * 
 * This script tests the Telegram bot functionality by simulating various interactions.
 * It requires a valid TELEGRAM_BOT_TOKEN in the .env file.
 * 
 * Usage:
 * node scripts/test-telegram-bot.js
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { query, transaction } = require('../server/database/connection');

// Check if bot token is available
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

// Create a test bot instance
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Test user ID (this should be a real Telegram user ID for testing)
const TEST_USER_ID = process.env.TEST_TELEGRAM_USER_ID || null;

// Test functions
async function runTests() {
  console.log('Starting Telegram bot tests...');
  
  // Test 1: Bot connection
  try {
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connection successful');
    console.log(`Bot username: @${botInfo.username}`);
  } catch (error) {
    console.error('❌ Bot connection failed:', error.message);
    process.exit(1);
  }
  
  // Test 2: Database connection
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
  
  // Test 3: Check if telegram_auth table exists
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'telegram_auth'
      )
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ telegram_auth table exists');
    } else {
      console.error('❌ telegram_auth table does not exist');
    }
  } catch (error) {
    console.error('❌ Error checking telegram_auth table:', error.message);
  }
  
  // Test 4: Send test message (if TEST_USER_ID is provided)
  if (TEST_USER_ID) {
    try {
      await bot.telegram.sendMessage(
        TEST_USER_ID,
        '🧪 This is a test message from the LumaLance bot test script.'
      );
      console.log('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send test message:', error.message);
    }
  } else {
    console.log('⚠️ Skipping test message (TEST_TELEGRAM_USER_ID not set)');
  }
  
  // Test 5: Check notification functions
  try {
    const { notifyNewProposal, notifyProposalStatusChange, notifyNewMessage } = require('../server/telegram/notifications');
    console.log('✅ Notification functions loaded successfully');
    
    if (notifyNewProposal && notifyProposalStatusChange && notifyNewMessage) {
      console.log('✅ All notification functions are defined');
    } else {
      console.error('❌ Some notification functions are missing');
    }
  } catch (error) {
    console.error('❌ Failed to load notification functions:', error.message);
  }
  
  // Test 6: Check command handlers
  try {
    const commandsHandler = require('../server/telegram/handlers/commands');
    const projectsHandler = require('../server/telegram/handlers/projects');
    const proposalsHandler = require('../server/telegram/handlers/proposals');
    const forwardHandler = require('../server/telegram/handlers/forward');
    
    console.log('✅ All command handlers loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load command handlers:', error.message);
  }
  
  console.log('\nTests completed!');
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error during tests:', error);
  process.exit(1);
});
