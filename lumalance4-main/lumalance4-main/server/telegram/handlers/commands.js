const { query } = require('../../database/connection');

/**
 * Command handlers for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */
module.exports = (bot) => {
  /**
   * Get user ID from telegram_id
   * @param {number} telegramId - The Telegram ID
   * @returns {Promise<number|null>} The user ID or null if not found
   */
  async function getUserIdFromTelegramId(telegramId) {
    try {
      const result = await query(
        'SELECT user_id FROM telegram_auth WHERE telegram_id = $1',
        [telegramId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].user_id;
    } catch (error) {
      console.error('Error getting user ID from Telegram ID:', error.message);
      return null;
    }
  }

  /**
   * Clear session data for a user
   * @param {Object} ctx - Telegraf context
   */
  function clearSession(ctx) {
    if (ctx.session) {
      delete ctx.session.projectData;
      delete ctx.session.step;
      delete ctx.session.userId;
      delete ctx.session.forwardedMessages;
    }
  }

  // Start command
  bot.command('start', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      // Clear any existing session data
      clearSession(ctx);
      
      // Generate web app URL with token if user is authenticated
      let webAppUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Welcome message
      let message = 'Welcome to LumaLance! 🚀\n\n';
      
      if (userId) {
        message += 'You are already connected to the platform.\n\n';
      } else {
        message += 'To fully use this bot, please link your Telegram account in the web app.\n\n';
      }
      
      message += 'Available commands:\n' +
        '/start - Show this welcome message\n' +
        '/post - Create a new project\n' +
        '/forward - Create project from forwarded messages\n' +
        '/proposals - View proposals for your projects\n' +
        '/help - Show all commands\n' +
        '/cancel - Cancel any ongoing process\n\n';
      
      // Add button to open web app
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Open LumaLance', url: webAppUrl }
          ]]
        }
      });
    } catch (error) {
      console.error('Start command error:', error.message);
      await ctx.reply('Sorry, there was an error processing your request. Please try again later.');
    }
  });

  // Help command
  bot.command('help', async (ctx) => {
    try {
      // Clear any existing session data
      clearSession(ctx);
      
      await ctx.reply(
        'Available commands:\n\n' +
        '/start - Show welcome message\n' +
        '/post - Create a new project\n' +
        '/forward - Create project from forwarded messages\n' +
        '/proposals - View proposals for your projects\n' +
        '/myproposals - View your submitted proposals\n' +
        '/projects - List your projects\n' +
        '/status - Check your account status\n' +
        '/cancel - Cancel any ongoing process\n' +
        '/help - Show this help message'
      );
    } catch (error) {
      console.error('Help command error:', error.message);
      await ctx.reply('Sorry, there was an error showing the help message. Please try again later.');
    }
  });

  // Cancel command
  bot.command('cancel', async (ctx) => {
    try {
      const wasInProcess = ctx.session && (ctx.session.step || ctx.session.projectData || ctx.session.forwardedMessages);
      
      // Clear any existing session data
      clearSession(ctx);
      
      if (wasInProcess) {
        await ctx.reply(
          '❌ Process cancelled successfully.\n\n' +
          'You can start a new process anytime using the available commands.\n\n' +
          'Use /help to see all available commands.'
        );
      } else {
        await ctx.reply(
          'No active process to cancel.\n\n' +
          'Use /help to see all available commands.'
        );
      }
    } catch (error) {
      console.error('Cancel command error:', error.message);
      await ctx.reply('Sorry, there was an error processing the cancel request.');
    }
  });

  // Status command - check if user is linked
  bot.command('status', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      // Clear any existing session data
      clearSession(ctx);
      
      if (userId) {
        // Get user profile
        const profileResult = await query(
          'SELECT display_name FROM profiles WHERE user_id = $1',
          [userId]
        );
        
        const displayName = profileResult.rows.length > 0 
          ? profileResult.rows[0].display_name 
          : 'Unknown';
        
        await ctx.reply(
          `✅ Your Telegram account is linked to LumaLance\n\n` +
          `Profile: ${displayName}\n` +
          `User ID: ${userId}\n\n` +
          `You can use all bot features.`
        );
      } else {
        const webAppUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        await ctx.reply(
          `❌ Your Telegram account is not linked to LumaLance\n\n` +
          `Please visit the web app to link your account.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🔗 Link Account', url: `${webAppUrl}/profile` }
              ]]
            }
          }
        );
      }
    } catch (error) {
      console.error('Status command error:', error.message);
      await ctx.reply('Sorry, there was an error checking your status. Please try again later.');
    }
  });

  // Handle unknown commands
  bot.on('text', (ctx, next) => {
    // If message starts with /, it's an unknown command
    if (ctx.message.text.startsWith('/')) {
      const command = ctx.message.text.split(' ')[0];
      
      // Clear any existing session data when encountering unknown commands
      clearSession(ctx);
      
      ctx.reply(`Unknown command: ${command}\nUse /help to see available commands.`);
      return;
    }
    
    // Otherwise, pass to next handler
    return next();
  });
};
