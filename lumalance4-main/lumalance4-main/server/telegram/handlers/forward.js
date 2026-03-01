const { query, transaction } = require('../../database/connection');

/**
 * Forward message handlers for the Telegram bot
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

  /**
   * Validate forward session data integrity
   * @param {Object} ctx - Telegraf context
   * @returns {boolean} Whether the session is valid
   */
  function isValidForwardSession(ctx) {
    return ctx.session && 
           ctx.session.userId && 
           ctx.session.step && 
           (ctx.session.step === 'collecting_forwards' || 
            ctx.session.step === 'awaiting_title_after_forward') &&
           ctx.session.forwardedMessages !== undefined;
  }

  // Forward command - start collecting forwarded messages
  bot.command('forward', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      if (!userId) {
        return ctx.reply(
          '❌ Your Telegram account is not linked to LumaLance\n\n' +
          'Please visit the web app to link your account first.',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🔗 Link Account', url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile` }
              ]]
            }
          }
        );
      }
      
      // Clear any existing session data first
      clearSession(ctx);
      
      // Initialize session for forward collection
      ctx.session = ctx.session || {};
      ctx.session.userId = userId;
      ctx.session.forwardedMessages = [];
      ctx.session.step = 'collecting_forwards';
      
      console.log(`Starting forward collection for user ${userId} (Telegram ID: ${telegramId})`);
      
      // Send message with inline keyboard
      await ctx.reply(
        'I\'m ready to collect forwarded messages for your project.\n\n' +
        'Forward me the messages you want to include in your project description.\n' +
        'When you\'re done, click "End Collection" below:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔚 End Collection', callback_data: 'end_forward_collection' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Forward command error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error starting the collection. Please try again later.');
    }
  });
  
  // Handle forwarded messages
  bot.on('message', async (ctx, next) => {
    // Skip if not in forward collection mode, not a forwarded message, or session is invalid
    if (!ctx.session || 
        ctx.session.step !== 'collecting_forwards' || 
        !ctx.message.forward_date ||
        !isValidForwardSession(ctx)) {
      return next();
    }
    
    // Additional validation: ensure the user matches the session
    const telegramId = ctx.from.id;
    const userId = await getUserIdFromTelegramId(telegramId);
    
    if (!userId || userId !== ctx.session.userId) {
      console.log(`Forward session mismatch for user ${telegramId}. Expected: ${ctx.session.userId}, Got: ${userId}`);
      clearSession(ctx);
      return next();
    }
    
    try {
      const messageText = ctx.message.text || ctx.message.caption || '';
      if (messageText && messageText.trim().length > 0) {
        ctx.session.forwardedMessages.push(messageText.trim());
        console.log(`Forward message collected for user ${userId}. Total: ${ctx.session.forwardedMessages.length}`);
        
        await ctx.reply(
          `✓ Message collected (${ctx.session.forwardedMessages.length} total)\n\n` +
          'Forward more messages or click "End Collection" when done.'
        );
      } else {
        await ctx.reply(
          '⚠️ This forwarded message doesn\'t contain any text.\n\n' +
          'Only text messages can be collected for project descriptions.'
        );
      }
    } catch (error) {
      console.error('Forward message handling error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error processing this forwarded message.');
    }
  });
  
  // Handle end collection button
  bot.action('end_forward_collection', async (ctx) => {
    try {
      if (!ctx.session || 
          ctx.session.step !== 'collecting_forwards' ||
          !isValidForwardSession(ctx)) {
        return ctx.reply('No active collection session found. Use /forward to start collecting messages.');
      }
      
      // Additional validation: ensure the user matches the session
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      if (!userId || userId !== ctx.session.userId) {
        console.log(`Forward end session mismatch for user ${telegramId}. Expected: ${ctx.session.userId}, Got: ${userId}`);
        clearSession(ctx);
        return ctx.reply('Session expired. Please use /forward to start over.');
      }
      
      if (ctx.session.forwardedMessages.length === 0) {
        clearSession(ctx);
        return ctx.reply(
          'No messages were collected.\n\n' +
          'Please forward some messages first or use /post to create a project directly.'
        );
      }
      
      // Update session state
      ctx.session.step = 'awaiting_title_after_forward';
      
      console.log(`Ending forward collection for user ${userId}. Collected ${ctx.session.forwardedMessages.length} messages`);
      
      // Remove inline keyboard
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      
      await ctx.reply(
        'Great! I\'ve collected all the messages.\n\n' +
        'Now, please provide a title for your project:'
      );
    } catch (error) {
      console.error('Forward end collection error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error processing your request. Please try again.');
    }
  });
  
  // Handle title input after forward collection
  bot.on('text', async (ctx, next) => {
    // Skip if not awaiting title after forward or session is invalid
    if (!ctx.session || 
        ctx.session.step !== 'awaiting_title_after_forward' ||
        !isValidForwardSession(ctx)) {
      return next();
    }
    
    // Additional validation: ensure the user matches the session
    const telegramId = ctx.from.id;
    const userId = await getUserIdFromTelegramId(telegramId);
    
    if (!userId || userId !== ctx.session.userId) {
      console.log(`Forward title session mismatch for user ${telegramId}. Expected: ${ctx.session.userId}, Got: ${userId}`);
      clearSession(ctx);
      return next();
    }
    
    try {
      const title = ctx.message.text.trim();
      
      if (!title || title.length === 0) {
        await ctx.reply('Please enter a valid project title:');
        return;
      }
      
      // Combine all forwarded messages into a description
      const description = ctx.session.forwardedMessages.join('\n\n---\n\n');
      
      console.log(`Creating project from forwarded messages for user ${userId}: ${title}`);
      
      // Create project in database
      const projectId = await transaction(async (client) => {
        const result = await client.query(
          `INSERT INTO projects (
            title, description, created_by, status
          )
          VALUES ($1, $2, $3, 'open')
          RETURNING id`,
          [title, description, userId]
        );
        
        return result.rows[0].id;
      });
      
      await ctx.reply(
        '✅ Project created successfully from forwarded messages!\n\n' +
        `Title: ${title}\n\n` +
        'Freelancers will be notified about this opportunity.',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 View Project', url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/projects/${projectId}` }
            ]]
          }
        }
      );
      
      // Clear session
      clearSession(ctx);
    } catch (error) {
      console.error('Forward title handling error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error creating your project. Please try again.');
    }
  });
};
