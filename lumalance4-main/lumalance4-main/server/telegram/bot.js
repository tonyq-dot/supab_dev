const { Telegraf, session } = require('telegraf');
const { query } = require('../database/connection');

// Bot instance holder
let botInstance = null;

/**
 * Initialize Telegram bot with Telegraf
 */
function createBot() {
  // Check if bot token is configured
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  // Create bot instance
  const bot = new Telegraf(token);

  // Use session middleware for state management
  bot.use(session({
    defaultSession: () => ({})
  }));

  // Add error handling middleware
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    console.error('Context:', {
      updateType: ctx.updateType,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      message: ctx.message?.text
    });
    
    // Try to send error message to user
    try {
      ctx.reply('Sorry, an error occurred. Please try again later.');
    } catch (replyError) {
      console.error('Failed to send error message to user:', replyError);
    }
  });

  // Add middleware to log all updates
  bot.use(async (ctx, next) => {
    const start = new Date();
    try {
      await next();
      const ms = new Date() - start;
      console.log(`Telegram: ${ctx.updateType} processed in ${ms}ms`);
    } catch (error) {
      const ms = new Date() - start;
      console.error(`Telegram: ${ctx.updateType} failed in ${ms}ms:`, error.message);
      throw error;
    }
  });

  // Add graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping bot...');
    if (bot) {
      bot.stop('SIGINT');
    }
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping bot...');
    if (bot) {
      bot.stop('SIGTERM');
    }
  });

  return bot;
}

/**
 * Get or create bot instance (singleton pattern)
 */
function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }
  return botInstance;
}

// Create bot instance
const bot = getBot();

// Register command handlers
// These will be required after the bot is created
function registerHandlers() {
  try {
    console.log('Registering Telegram bot handlers...');
    
    require('./handlers/commands')(bot);
    require('./handlers/projects')(bot);
    require('./handlers/proposals')(bot);
    require('./handlers/forward')(bot);
    
    console.log('Telegram bot handlers registered successfully');
  } catch (error) {
    console.error('Failed to register bot handlers:', error);
    throw error;
  }
}

module.exports = {
  bot,
  registerHandlers,
  getBot
};
