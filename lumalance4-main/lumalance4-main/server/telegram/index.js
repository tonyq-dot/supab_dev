const { bot, registerHandlers } = require('./bot');

// Track bot status
let botRunning = false;
let botStarting = false;

/**
 * Start the Telegram bot
 * @returns {Promise<boolean>} Whether the bot was started successfully
 */
async function startBot() {
  // Prevent duplicate startup attempts
  if (botStarting) {
    console.log('Bot is already starting, skipping...');
    return false;
  }
  
  if (botRunning) {
    console.log('Bot is already running, skipping...');
    return true;
  }
  
  botStarting = true;
  
  try {
    console.log('Starting Telegram bot...');
    
    // Register all handlers
    registerHandlers();

    // Set up proper error handling for the bot launch
    const botLaunchPromise = bot.launch();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bot launch timeout')), 30000);
    });
    
    // Race between bot launch and timeout
    await Promise.race([botLaunchPromise, timeoutPromise]);
    
    console.log('Telegram bot started successfully');
    botRunning = true;
    botStarting = false;
    
    // Set up graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}, shutting down bot gracefully...`);
      stopBot().then(() => {
        console.log('Bot stopped gracefully');
        process.exit(0);
      }).catch(error => {
        console.error('Error during bot shutdown:', error);
        process.exit(1);
      });
    };
    
    // Remove existing listeners to prevent duplicates
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    
    // Add new listeners
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    return true;
  } catch (error) {
    console.error('Failed to start Telegram bot:', error.message);
    console.error('Stack trace:', error.stack);
    botRunning = false;
    botStarting = false;
    return false;
  }
}

/**
 * Stop the Telegram bot
 * @returns {Promise<boolean>} Whether the bot was stopped successfully
 */
async function stopBot() {
  if (!botRunning) {
    console.log('Bot is not running, nothing to stop');
    return true;
  }
  
  try {
    console.log('Stopping Telegram bot...');
    
    // Stop the bot with a timeout
    const stopPromise = bot.stop();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bot stop timeout')), 10000);
    });
    
    await Promise.race([stopPromise, timeoutPromise]);
    
    botRunning = false;
    console.log('Telegram bot stopped successfully');
    return true;
  } catch (error) {
    console.error('Failed to stop Telegram bot:', error.message);
    botRunning = false;
    return false;
  }
}

/**
 * Restart the Telegram bot
 * @returns {Promise<boolean>} Whether the bot was restarted successfully
 */
async function restartBot() {
  console.log('Restarting Telegram bot...');
  
  const stopped = await stopBot();
  if (!stopped) {
    console.warn('Failed to stop bot, attempting to start anyway...');
  }
  
  // Wait a bit before restarting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return await startBot();
}

/**
 * Get bot status
 * @returns {Object} Bot status information
 */
function getBotStatus() {
  return {
    running: botRunning,
    starting: botStarting
  };
}

module.exports = {
  bot,
  startBot,
  stopBot,
  restartBot,
  getBotStatus
};
