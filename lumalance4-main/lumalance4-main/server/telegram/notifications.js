const { bot } = require('./index');
const { query } = require('../database/connection');

/**
 * Send a notification to a user via Telegram
 * @param {number} userId - The user ID
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
async function sendNotification(userId, message) {
  try {
    // Get telegram_id from telegram_auth
    const result = await query(
      'SELECT telegram_id FROM telegram_auth WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`No Telegram account linked for user ${userId}`);
      return false; // User has no linked Telegram account
    }
    
    const telegramId = result.rows[0].telegram_id;
    await bot.telegram.sendMessage(telegramId, message);
    console.log(`Notification sent to user ${userId} (Telegram ID: ${telegramId})`);
    return true;
  } catch (error) {
    console.error('Telegram notification error:', error.message);
    return false;
  }
}

/**
 * Notify a user about a new proposal on their project
 * @param {number} projectId - The project ID
 * @param {number} proposalId - The proposal ID
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
async function notifyNewProposal(projectId, proposalId) {
  try {
    const result = await query(
      `SELECT p.created_by, p.title, pr.amount, pr.timeline_days, 
              u.id as freelancer_id, prof.display_name
       FROM projects p
       JOIN proposals pr ON p.id = pr.project_id
       JOIN users u ON pr.freelancer_id = u.id
       JOIN profiles prof ON u.id = prof.user_id
       WHERE p.id = $1 AND pr.id = $2`,
      [projectId, proposalId]
    );
    
    if (result.rows.length === 0) {
      console.log(`Project ${projectId} or proposal ${proposalId} not found`);
      return false;
    }
    
    const { created_by, title, amount, timeline_days, display_name } = result.rows[0];
    
    const message = 
      `🎯 New proposal received on your project "${title}"\n\n` +
      `From: ${display_name}\n` +
      `Amount: $${amount}\n` +
      `Timeline: ${timeline_days} days\n\n` +
      'Use the web interface to review and manage proposals.';
    
    return await sendNotification(created_by, message);
  } catch (error) {
    console.error('New proposal notification error:', error.message);
    return false;
  }
}

/**
 * Notify a freelancer about a proposal status change
 * @param {number} proposalId - The proposal ID
 * @param {string} status - The new status
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
async function notifyProposalStatusChange(proposalId, status) {
  try {
    const result = await query(
      `SELECT pr.freelancer_id, pr.amount, pr.timeline_days, 
              p.title, p.id as project_id
       FROM proposals pr
       JOIN projects p ON pr.project_id = p.id
       WHERE pr.id = $1`,
      [proposalId]
    );
    
    if (result.rows.length === 0) {
      console.log(`Proposal ${proposalId} not found`);
      return false;
    }
    
    const { freelancer_id, amount, timeline_days, title, project_id } = result.rows[0];
    
    let statusText;
    let emoji;
    
    switch (status) {
      case 'accepted':
        statusText = 'accepted';
        emoji = '✅';
        break;
      case 'rejected':
        statusText = 'rejected';
        emoji = '❌';
        break;
      default:
        statusText = status;
        emoji = '📝';
    }
    
    const message = 
      `${emoji} Your proposal on project "${title}" has been ${statusText}\n\n` +
      `Amount: $${amount}\n` +
      `Timeline: ${timeline_days} days\n\n` +
      'Check the web interface for more details.';
    
    return await sendNotification(freelancer_id, message);
  } catch (error) {
    console.error('Proposal status notification error:', error.message);
    return false;
  }
}

/**
 * Notify a user about a new message
 * @param {number} userId - The user ID to notify
 * @param {number} messageId - The message ID
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
async function notifyNewMessage(userId, messageId) {
  try {
    const result = await query(
      `SELECT m.content, m.conversation_id, 
              s.display_name as sender_name
       FROM messages m
       JOIN profiles s ON m.sender_id = s.user_id
       WHERE m.id = $1`,
      [messageId]
    );
    
    if (result.rows.length === 0) {
      console.log(`Message ${messageId} not found`);
      return false;
    }
    
    const { content, conversation_id, sender_name } = result.rows[0];
    
    // Truncate message content if too long
    const truncatedContent = content.length > 50 
      ? content.substring(0, 47) + '...' 
      : content;
    
    const message = 
      `📬 New message from ${sender_name}\n\n` +
      `"${truncatedContent}"\n\n` +
      'Open the web interface to view and reply.';
    
    return await sendNotification(userId, message);
  } catch (error) {
    console.error('New message notification error:', error.message);
    return false;
  }
}

module.exports = {
  sendNotification,
  notifyNewProposal,
  notifyProposalStatusChange,
  notifyNewMessage
};
