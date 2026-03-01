/**
 * Messages API Routes
 * 
 * This file contains routes for managing conversations and messages
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../database/connection');
const { auth: authenticateToken } = require('../middleware/auth');

// Import Telegram notification functions if available
let telegramNotifications = null;
try {
  telegramNotifications = require('../telegram/notifications');
} catch (error) {
  console.log('Telegram notifications not available:', error.message);
}

/**
 * Get all conversations for the authenticated user
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all conversations where the user is a participant
    const result = await query(`
      SELECT 
        c.id, 
        c.title, 
        c.project_id, 
        c.is_group, 
        c.created_at, 
        c.updated_at,
        p.id AS project_id,
        p.title AS project_title,
        p.slug AS project_slug,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at
        ) AS unread_count,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS last_message_at,
        (
          SELECT json_agg(json_build_object(
            'id', u.id,
            'email', u.email,
            'display_name', COALESCE(prof.display_name, u.email),
            'avatar_url', prof.avatar_url
          ))
          FROM conversation_participants cp2
          JOIN users u ON cp2.user_id = u.id
          LEFT JOIN profiles prof ON u.id = prof.user_id
          WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
        ) AS participants
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `, [userId]);
    
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * Get a specific conversation by ID
 */
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    
    // Check if user is a participant in the conversation
    const participantCheck = await query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Get conversation details
    const conversationResult = await query(`
      SELECT 
        c.id, 
        c.title, 
        c.project_id, 
        c.is_group, 
        c.created_at, 
        c.updated_at,
        p.id AS project_id,
        p.title AS project_title,
        p.slug AS project_slug,
        (
          SELECT json_agg(json_build_object(
            'id', u.id,
            'email', u.email,
            'display_name', COALESCE(prof.display_name, u.email),
            'avatar_url', prof.avatar_url
          ))
          FROM conversation_participants cp
          JOIN users u ON cp.user_id = u.id
          LEFT JOIN profiles prof ON u.id = prof.user_id
          WHERE cp.conversation_id = c.id
        ) AS participants
      FROM conversations c
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.id = $1
    `, [conversationId]);
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Update last_read_at for the user
    await query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    res.json({ conversation: conversationResult.rows[0] });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Get messages for a specific conversation
 */
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    // Check if user is a participant in the conversation
    const participantCheck = await query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Get messages
    const messagesResult = await query(`
      SELECT 
        m.id, 
        m.conversation_id, 
        m.sender_id, 
        m.content, 
        m.is_system_message, 
        m.created_at, 
        m.updated_at,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'display_name', COALESCE(prof.display_name, u.email),
          'avatar_url', prof.avatar_url
        ) AS sender
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN profiles prof ON u.id = prof.user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);
    
    // Update last_read_at for the user
    await query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    res.json({ 
      messages: messagesResult.rows,
      pagination: {
        limit,
        offset,
        total: parseInt(messagesResult.rowCount)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Create a new conversation
 */
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, participantIds, projectId, isGroup } = req.body;
    
    // Validate input
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }
    
    // Make sure all participants exist
    const uniqueParticipantIds = [...new Set([...participantIds, userId])];
    const participantsResult = await query(
      'SELECT id FROM users WHERE id = ANY($1)',
      [uniqueParticipantIds]
    );
    
    if (participantsResult.rows.length !== uniqueParticipantIds.length) {
      return res.status(400).json({ error: 'One or more participants do not exist' });
    }
    
    // Check if project exists if projectId is provided
    if (projectId) {
      const projectResult = await query('SELECT id FROM projects WHERE id = $1', [projectId]);
      if (projectResult.rows.length === 0) {
        return res.status(400).json({ error: 'Project does not exist' });
      }
    }
    
    // Check if a direct conversation already exists between these users
    if (!isGroup && uniqueParticipantIds.length === 2) {
      const existingConversationResult = await query(`
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
        WHERE c.is_group = false
        AND (c.project_id IS NULL OR c.project_id = $3)
        AND (
          SELECT COUNT(*) FROM conversation_participants cp 
          WHERE cp.conversation_id = c.id
        ) = 2
      `, [userId, participantIds[0], projectId || null]);
      
      if (existingConversationResult.rows.length > 0) {
        const conversationId = existingConversationResult.rows[0].id;
        
        // Get conversation details
        const conversationResult = await query(`
          SELECT 
            c.id, 
            c.title, 
            c.project_id, 
            c.is_group, 
            c.created_at, 
            c.updated_at,
            (
              SELECT json_agg(json_build_object(
                'id', u.id,
                'email', u.email,
                'display_name', COALESCE(prof.display_name, u.email),
                'avatar_url', prof.avatar_url
              ))
              FROM conversation_participants cp
              JOIN users u ON cp.user_id = u.id
              LEFT JOIN profiles prof ON u.id = prof.user_id
              WHERE cp.conversation_id = c.id
            ) AS participants
          FROM conversations c
          WHERE c.id = $1
        `, [conversationId]);
        
        return res.json({ 
          conversation: conversationResult.rows[0],
          message: 'Existing conversation found'
        });
      }
    }
    
    // Create new conversation using a transaction
    const result = await transaction(async (client) => {
      // Create conversation
      const conversationResult = await client.query(`
        INSERT INTO conversations (title, project_id, is_group)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [title || null, projectId || null, isGroup || false]);
      
      const conversationId = conversationResult.rows[0].id;
      
      // Add participants
      for (const participantId of uniqueParticipantIds) {
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES ($1, $2, $3)
        `, [conversationId, participantId, participantId === userId]);
      }
      
      // Add system message
      await client.query(`
        INSERT INTO messages (conversation_id, sender_id, content, is_system_message)
        VALUES ($1, $2, $3, true)
      `, [conversationId, userId, 'Conversation created']);
      
      // Get conversation with participants
      const fullConversationResult = await client.query(`
        SELECT 
          c.id, 
          c.title, 
          c.project_id, 
          c.is_group, 
          c.created_at, 
          c.updated_at,
          (
            SELECT json_agg(json_build_object(
              'id', u.id,
              'email', u.email,
              'display_name', COALESCE(prof.display_name, u.email),
              'avatar_url', prof.avatar_url
            ))
            FROM conversation_participants cp
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN profiles prof ON u.id = prof.user_id
            WHERE cp.conversation_id = c.id
          ) AS participants
        FROM conversations c
        WHERE c.id = $1
      `, [conversationId]);
      
      return fullConversationResult.rows[0];
    });
    
    res.status(201).json({ conversation: result });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Send a message to a conversation
 */
router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { content } = req.body;
    
    // Validate input
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if user is a participant in the conversation
    const participantCheck = await query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Create message
    const messageResult = await query(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [conversationId, userId, content]);
    
    // Get message with sender details
    const fullMessageResult = await query(`
      SELECT 
        m.id, 
        m.conversation_id, 
        m.sender_id, 
        m.content, 
        m.is_system_message, 
        m.created_at, 
        m.updated_at,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'display_name', COALESCE(prof.display_name, u.email),
          'avatar_url', prof.avatar_url
        ) AS sender
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN profiles prof ON u.id = prof.user_id
      WHERE m.id = $1
    `, [messageResult.rows[0].id]);
    
    // Update last_read_at for the sender
    await query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    // Get other participants to notify
    const participantsResult = await query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [conversationId, userId]
    );
    
    // Send Telegram notifications to other participants
    if (telegramNotifications && participantsResult.rows.length > 0) {
      const messageId = messageResult.rows[0].id;
      
      // Send notifications asynchronously (don't wait for them to complete)
      for (const participant of participantsResult.rows) {
        telegramNotifications.notifyNewMessage(participant.user_id, messageId)
          .catch(error => {
            console.error(`Error sending Telegram notification to user ${participant.user_id}:`, error.message);
          });
      }
    }
    
    res.status(201).json({ message: fullMessageResult.rows[0] });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Mark conversation as read
 */
router.post('/conversations/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    
    // Check if user is a participant in the conversation
    const participantCheck = await query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Update last_read_at for the user
    await query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

/**
 * Get unread message count for the authenticated user
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        COUNT(*) AS total_unread,
        COUNT(DISTINCT m.conversation_id) AS unread_conversations
      FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = $1 AND m.created_at > cp.last_read_at AND m.sender_id != $1
    `, [userId]);
    
    res.json({
      total_unread: parseInt(result.rows[0].total_unread),
      unread_conversations: parseInt(result.rows[0].unread_conversations)
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
