const { query } = require('../../database/connection');

/**
 * Proposal-related handlers for the Telegram bot
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

  // Proposals command - view proposals for your projects
  bot.command('proposals', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      // Clear any existing session data
      clearSession(ctx);
      
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
      
      // Get projects with proposals
      const projectsResult = await query(
        `SELECT p.id, p.title, COUNT(pr.id) as proposal_count
         FROM projects p
         LEFT JOIN proposals pr ON p.id = pr.project_id
         WHERE p.created_by = $1
         GROUP BY p.id, p.title
         ORDER BY p.created_at DESC`,
        [userId]
      );
      
      if (projectsResult.rows.length === 0) {
        return ctx.reply(
          'You don\'t have any projects yet.\n\n' +
          'Use /post to create your first project!'
        );
      }
      
      const projectsWithProposals = projectsResult.rows.filter(p => p.proposal_count > 0);
      
      if (projectsWithProposals.length === 0) {
        return ctx.reply(
          'None of your projects have received proposals yet.\n\n' +
          'Your projects are visible to freelancers, but no one has submitted a proposal yet.'
        );
      }
      
      // Create inline keyboard for projects
      const keyboard = projectsWithProposals.map(project => [
        { text: `${project.title} (${project.proposal_count} proposals)`, callback_data: `view_proposals_${project.id}` }
      ]);
      
      await ctx.reply('Select a project to view its proposals:', {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Proposals command error:', error.message);
      await ctx.reply('Sorry, there was an error retrieving your projects. Please try again later.');
    }
  });

  // My proposals command - view proposals you've submitted
  bot.command('myproposals', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const userId = await getUserIdFromTelegramId(telegramId);
      
      // Clear any existing session data
      clearSession(ctx);
      
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
      
      // Get user's proposals
      const proposalsResult = await query(
        `SELECT pr.id, pr.amount, pr.timeline_days, pr.status, pr.created_at,
                p.title as project_title
         FROM proposals pr
         JOIN projects p ON pr.project_id = p.id
         WHERE pr.freelancer_id = $1
         ORDER BY pr.created_at DESC
         LIMIT 10`,
        [userId]
      );
      
      if (proposalsResult.rows.length === 0) {
        return ctx.reply(
          'You haven\'t submitted any proposals yet.\n\n' +
          'Browse projects in the web interface to start submitting proposals!'
        );
      }
      
      // Format proposals list
      let message = '📋 Your Submitted Proposals:\n\n';
      
      for (const proposal of proposalsResult.rows) {
        const createdAt = new Date(proposal.created_at).toLocaleDateString();
        let statusEmoji;
        
        switch (proposal.status) {
          case 'accepted':
            statusEmoji = '✅';
            break;
          case 'rejected':
            statusEmoji = '❌';
            break;
          case 'pending':
            statusEmoji = '⏳';
            break;
          default:
            statusEmoji = '📝';
        }
        
        message += `${statusEmoji} Project: ${proposal.project_title}\n` +
                   `Amount: $${proposal.amount}\n` +
                   `Timeline: ${proposal.timeline_days} days\n` +
                   `Status: ${proposal.status}\n` +
                   `Submitted: ${createdAt}\n\n`;
      }
      
      message += 'Use the web interface to manage your proposals in detail.';
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Open Web Interface', url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/proposals` }
          ]]
        }
      });
    } catch (error) {
      console.error('My proposals command error:', error.message);
      await ctx.reply('Sorry, there was an error retrieving your proposals. Please try again later.');
    }
  });

  // Handle project selection for viewing proposals
  bot.action(/view_proposals_(\d+)/, async (ctx) => {
    try {
      const projectId = ctx.match[1];
      
      // Get proposals for the project
      const proposalsResult = await query(
        `SELECT pr.id, pr.amount, pr.timeline_days, pr.cover_letter, pr.status,
                pr.created_at, u.id as freelancer_id, p.display_name
         FROM proposals pr
         JOIN users u ON pr.freelancer_id = u.id
         JOIN profiles p ON u.id = p.user_id
         WHERE pr.project_id = $1
         ORDER BY pr.created_at DESC`,
        [projectId]
      );
      
      if (proposalsResult.rows.length === 0) {
        return ctx.reply('This project has no proposals yet.');
      }
      
      // Get project title
      const projectResult = await query(
        'SELECT title FROM projects WHERE id = $1',
        [projectId]
      );
      
      const projectTitle = projectResult.rows[0]?.title || 'Unknown Project';
      
      await ctx.reply(`📋 Proposals for "${projectTitle}":`);
      
      // Send each proposal as a separate message
      for (const proposal of proposalsResult.rows) {
        const createdAt = new Date(proposal.created_at).toLocaleDateString();
        let statusEmoji;
        
        switch (proposal.status) {
          case 'accepted':
            statusEmoji = '✅';
            break;
          case 'rejected':
            statusEmoji = '❌';
            break;
          case 'pending':
            statusEmoji = '⏳';
            break;
          default:
            statusEmoji = '📝';
        }
        
        // Truncate cover letter if too long
        const coverLetter = proposal.cover_letter.length > 200
          ? proposal.cover_letter.substring(0, 197) + '...'
          : proposal.cover_letter;
        
        await ctx.reply(
          `${statusEmoji} Proposal from ${proposal.display_name}\n` +
          `💰 Amount: $${proposal.amount}\n` +
          `⏱ Timeline: ${proposal.timeline_days} days\n` +
          `📅 Submitted: ${createdAt}\n` +
          `📝 Cover Letter:\n${coverLetter}\n\n` +
          `Use the web interface to accept or reject this proposal.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🌐 View in Web Interface', url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/projects/${projectId}/proposals` }
              ]]
            }
          }
        );
      }
    } catch (error) {
      console.error('View proposals error:', error.message);
      await ctx.reply('Sorry, there was an error retrieving the proposals. Please try again later.');
    }
  });
};
