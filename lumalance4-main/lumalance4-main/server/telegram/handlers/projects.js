const { query, transaction } = require('../../database/connection');

/**
 * Project-related handlers for the Telegram bot
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
    }
  }

  /**
   * Validate session data integrity
   * @param {Object} ctx - Telegraf context
   * @returns {boolean} Whether the session is valid
   */
  function isValidSession(ctx) {
    return ctx.session && 
           ctx.session.userId && 
           ctx.session.step && 
           ctx.session.projectData !== undefined;
  }

  // Post command - start project creation flow
  bot.command('post', async (ctx) => {
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
      
      // Initialize session for project creation
      ctx.session = ctx.session || {};
      ctx.session.userId = userId;
      ctx.session.projectData = {};
      ctx.session.step = 'awaiting_title';
      
      console.log(`Starting project creation for user ${userId} (Telegram ID: ${telegramId})`);
      
      await ctx.reply('Let\'s create a new project! Please enter the project title:');
    } catch (error) {
      console.error('Post command error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error starting project creation. Please try again later.');
    }
  });

  // List projects command
  bot.command('projects', async (ctx) => {
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
      
      // Get user's projects
      const projectsResult = await query(
        `SELECT id, title, status, created_at, 
                budget_min, budget_max
         FROM projects 
         WHERE created_by = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      );
      
      if (projectsResult.rows.length === 0) {
        return ctx.reply(
          'You haven\'t created any projects yet.\n\n' +
          'Use /post to create your first project!'
        );
      }
      
      // Format projects list
      let message = '📋 Your Projects:\n\n';
      
      for (const project of projectsResult.rows) {
        const createdAt = new Date(project.created_at).toLocaleDateString();
        const budget = project.budget_min && project.budget_max 
          ? `$${project.budget_min}-${project.budget_max}` 
          : 'Not specified';
        
        message += `📌 ${project.title}\n` +
                   `Status: ${project.status}\n` +
                   `Budget: ${budget}\n` +
                   `Created: ${createdAt}\n\n`;
      }
      
      message += 'Use the web interface to manage your projects in detail.';
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Open Web Interface', url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/projects` }
          ]]
        }
      });
    } catch (error) {
      console.error('Projects command error:', error.message);
      await ctx.reply('Sorry, there was an error retrieving your projects. Please try again later.');
    }
  });

  // Handle text messages for project creation flow
  bot.on('text', async (ctx, next) => {
    // Skip if not in project creation flow or session is invalid
    if (!ctx.session || 
        !ctx.session.step || 
        !ctx.session.step.startsWith('awaiting_') ||
        !isValidSession(ctx)) {
      return next();
    }
    
    // Additional validation: ensure the user matches the session
    const telegramId = ctx.from.id;
    const userId = await getUserIdFromTelegramId(telegramId);
    
    if (!userId || userId !== ctx.session.userId) {
      console.log(`Session mismatch for user ${telegramId}. Expected: ${ctx.session.userId}, Got: ${userId}`);
      clearSession(ctx);
      return next();
    }
    
    console.log(`Processing text message for user ${userId} in step: ${ctx.session.step}`);
    
    try {
      switch (ctx.session.step) {
        case 'awaiting_title':
          if (!ctx.message.text || ctx.message.text.trim().length === 0) {
            await ctx.reply('Please enter a valid project title:');
            return;
          }
          
          ctx.session.projectData.title = ctx.message.text.trim();
          ctx.session.step = 'awaiting_description';
          await ctx.reply('Great! Now please enter the project description:');
          break;
          
        case 'awaiting_description':
          if (!ctx.message.text || ctx.message.text.trim().length === 0) {
            await ctx.reply('Please enter a valid project description:');
            return;
          }
          
          ctx.session.projectData.description = ctx.message.text.trim();
          ctx.session.step = 'awaiting_budget';
          await ctx.reply(
            'Please enter the project budget range in USD (e.g., 500-1000):\n\n' +
            'Or type "skip" to leave the budget unspecified.'
          );
          break;
          
        case 'awaiting_budget':
          let budgetMin = null;
          let budgetMax = null;
          
          if (ctx.message.text.toLowerCase() !== 'skip') {
            const budgetText = ctx.message.text.trim();
            const budgetRange = budgetText.split('-');
            
            if (budgetRange.length !== 2 || 
                isNaN(parseFloat(budgetRange[0])) || 
                isNaN(parseFloat(budgetRange[1]))) {
              await ctx.reply(
                'Invalid budget format. Please enter two numbers separated by a hyphen (e.g., 500-1000):\n\n' +
                'Or type "skip" to leave the budget unspecified.'
              );
              return;
            }
            
            budgetMin = parseFloat(budgetRange[0]);
            budgetMax = parseFloat(budgetRange[1]);
            
            if (budgetMin <= 0 || budgetMax <= 0 || budgetMin > budgetMax) {
              await ctx.reply(
                'Invalid budget range. Please ensure both numbers are positive and the first number is less than the second.\n\n' +
                'Or type "skip" to leave the budget unspecified.'
              );
              return;
            }
          }
          
          // Create project in database
          const projectId = await transaction(async (client) => {
            const result = await client.query(
              `INSERT INTO projects (
                title, description, created_by, status, 
                budget_min, budget_max
              )
              VALUES ($1, $2, $3, 'open', $4, $5)
              RETURNING id`,
              [
                ctx.session.projectData.title,
                ctx.session.projectData.description,
                ctx.session.userId,
                budgetMin,
                budgetMax
              ]
            );
            
            return result.rows[0].id;
          });
          
          const budgetText = budgetMin && budgetMax 
            ? `Budget: $${budgetMin}-${budgetMax}\n` 
            : '';
          
          console.log(`Project created successfully: ${projectId} by user ${userId}`);
          
          await ctx.reply(
            '✅ Project created successfully!\n\n' +
            `Title: ${ctx.session.projectData.title}\n` +
            `Description: ${ctx.session.projectData.description}\n` +
            budgetText + '\n' +
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
          break;
          
        default:
          // Unknown step - clear session
          console.log(`Unknown step: ${ctx.session.step} for user ${userId}`);
          clearSession(ctx);
          return next();
      }
    } catch (error) {
      console.error('Project creation error:', error.message);
      clearSession(ctx);
      await ctx.reply('Sorry, there was an error processing your input. Please try again with /post.');
    }
  });
};
