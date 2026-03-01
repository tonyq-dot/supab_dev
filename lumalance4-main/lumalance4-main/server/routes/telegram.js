const express = require('express');
const crypto = require('crypto');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

/**
 * Verify Telegram authentication data
 * @param {Object} authData - Telegram authentication data
 * @returns {boolean} - Whether the data is valid
 */
function verifyTelegramData(authData) {
  try {
    const { hash, ...data } = authData;
    
    if (!hash) {
      console.error('Missing hash in Telegram auth data');
      return false;
    }
    
    // Validate required fields
    if (!data.id || !data.first_name || !data.auth_date) {
      console.error('Missing required fields in Telegram auth data');
      return false;
    }
    
    // Sort keys alphabetically
    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n');
    
    // Create a secret key from the bot token
    const secretKey = crypto
      .createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Calculate the hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error verifying Telegram data:', error.message);
    return false;
  }
}

/**
 * @route POST /api/telegram/auth
 * @desc Authenticate with Telegram
 * @access Public
 */
router.post('/auth', async (req, res) => {
  try {
    const telegramData = req.body;
    
    // Validate input
    if (!telegramData || typeof telegramData !== 'object') {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    console.log('Telegram auth attempt for user:', telegramData.id);
    
    // Validate Telegram data
    if (!verifyTelegramData(telegramData)) {
      console.error('Invalid Telegram authentication data for user:', telegramData.id);
      return res.status(400).json({ message: 'Invalid authentication data' });
    }
    
    // Check if auth_date is not expired (within 24 hours)
    const authDate = parseInt(telegramData.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (isNaN(authDate) || currentTime - authDate > 86400) {
      console.error('Expired Telegram authentication data for user:', telegramData.id);
      return res.status(400).json({ message: 'Authentication data expired' });
    }
    
    let userId;
    
    // Start transaction for database operations
    userId = await transaction(async (client) => {
      // Check if user with this Telegram ID already exists
      const telegramResult = await client.query(
        'SELECT * FROM telegram_auth WHERE telegram_id = $1',
        [telegramData.id]
      );
      
      if (telegramResult.rows.length > 0) {
        // User already exists, get user ID
        const existingUserId = telegramResult.rows[0].user_id;
        
        // Update Telegram data
        await client.query(
          `UPDATE telegram_auth 
           SET telegram_username = $1, telegram_first_name = $2, telegram_last_name = $3, 
               telegram_photo_url = $4, auth_date = to_timestamp($5), updated_at = NOW()
           WHERE telegram_id = $6`,
          [
            telegramData.username || null,
            telegramData.first_name || null,
            telegramData.last_name || null,
            telegramData.photo_url || null,
            authDate,
            telegramData.id
          ]
        );
        
        console.log('Updated existing Telegram user:', existingUserId);
        return existingUserId;
      } else {
        // Create new user with Telegram data
        console.log('Creating new user for Telegram ID:', telegramData.id);
        
        // Create user
        const userResult = await client.query(
          'INSERT INTO users (email) VALUES ($1) RETURNING id',
          [`telegram_${telegramData.id}@telegram.user`] // Use a placeholder email
        );
        
        const newUserId = userResult.rows[0].id;
        
        // Create profile
        await client.query(
          'INSERT INTO profiles (user_id, first_name, last_name, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5)',
          [
            newUserId,
            telegramData.first_name || null,
            telegramData.last_name || null,
            (telegramData.first_name || '') + (telegramData.last_name ? ` ${telegramData.last_name}` : ''),
            telegramData.photo_url || null
          ]
        );
        
        // Create Telegram auth record
        await client.query(
          `INSERT INTO telegram_auth 
           (user_id, telegram_id, telegram_username, telegram_first_name, telegram_last_name, 
            telegram_photo_url, auth_date)
           VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7))`,
          [
            newUserId,
            telegramData.id,
            telegramData.username || null,
            telegramData.first_name || null,
            telegramData.last_name || null,
            telegramData.photo_url || null,
            authDate
          ]
        );
        
        console.log('Created new user:', newUserId);
        return newUserId;
      }
    });
    
    // Get user data
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found after authentication:', userId);
      return res.status(500).json({ message: 'User not found after authentication' });
    }
    
    const user = userResult.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );
    
    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    // Store refresh token in database
    await transaction(async (client) => {
      // Delete any existing refresh tokens for this user
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
      
      // Insert new refresh token
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, expiresAt]
      );
    });
    
    console.log('Telegram authentication successful for user:', userId);
    
    res.json({
      message: 'Telegram authentication successful',
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Telegram authentication error:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Return generic error to avoid exposing internal details
    res.status(500).json({ message: 'Authentication failed due to server error' });
  }
});

/**
 * @route POST /api/telegram/link
 * @desc Link Telegram account to existing user
 * @access Private
 */
router.post('/link', auth, async (req, res) => {
  try {
    const telegramData = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!telegramData || typeof telegramData !== 'object') {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    console.log('Telegram link attempt for user:', userId);
    
    // Validate Telegram data
    if (!verifyTelegramData(telegramData)) {
      console.error('Invalid Telegram authentication data for link:', telegramData.id);
      return res.status(400).json({ message: 'Invalid authentication data' });
    }
    
    // Check if auth_date is not expired (within 24 hours)
    const authDate = parseInt(telegramData.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (isNaN(authDate) || currentTime - authDate > 86400) {
      console.error('Expired Telegram authentication data for link:', telegramData.id);
      return res.status(400).json({ message: 'Authentication data expired' });
    }
    
    // Check if this Telegram ID is already linked to another account
    const telegramResult = await query(
      'SELECT * FROM telegram_auth WHERE telegram_id = $1',
      [telegramData.id]
    );
    
    if (telegramResult.rows.length > 0 && telegramResult.rows[0].user_id !== userId) {
      console.error('Telegram ID already linked to another account:', telegramData.id);
      return res.status(400).json({ message: 'This Telegram account is already linked to another user' });
    }
    
    // Link or update Telegram data
    await transaction(async (client) => {
      if (telegramResult.rows.length > 0) {
        // Update existing link
        await client.query(
          `UPDATE telegram_auth 
           SET telegram_username = $1, telegram_first_name = $2, telegram_last_name = $3, 
               telegram_photo_url = $4, auth_date = to_timestamp($5), updated_at = NOW()
           WHERE telegram_id = $6`,
          [
            telegramData.username || null,
            telegramData.first_name || null,
            telegramData.last_name || null,
            telegramData.photo_url || null,
            authDate,
            telegramData.id
          ]
        );
      } else {
        // Create new link
        await client.query(
          `INSERT INTO telegram_auth 
           (user_id, telegram_id, telegram_username, telegram_first_name, telegram_last_name, 
            telegram_photo_url, auth_date)
           VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7))`,
          [
            userId,
            telegramData.id,
            telegramData.username || null,
            telegramData.first_name || null,
            telegramData.last_name || null,
            telegramData.photo_url || null,
            authDate
          ]
        );
      }
    });
    
    console.log('Telegram account linked successfully for user:', userId);
    
    res.json({
      message: 'Telegram account linked successfully'
    });
  } catch (error) {
    console.error('Telegram linking error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Linking failed due to server error' });
  }
});

/**
 * @route GET /api/telegram/widget-data
 * @desc Get Telegram widget configuration data
 * @access Public
 */
router.get('/widget-data', (req, res) => {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    
    if (!botUsername) {
      console.error('TELEGRAM_BOT_USERNAME not configured');
      return res.status(500).json({ message: 'Telegram bot not configured' });
    }
    
    res.json({
      botUsername: botUsername
    });
  } catch (error) {
    console.error('Widget data error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/telegram/status
 * @desc Get Telegram account status for authenticated user
 * @access Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get Telegram auth data
    const telegramResult = await query(
      'SELECT telegram_username, telegram_first_name, telegram_last_name, telegram_photo_url FROM telegram_auth WHERE user_id = $1',
      [userId]
    );
    
    if (telegramResult.rows.length === 0) {
      return res.json({
        isLinked: false,
        telegramData: null
      });
    }
    
    const telegramData = telegramResult.rows[0];
    
    res.json({
      isLinked: true,
      telegramData: {
        username: telegramData.telegram_username,
        firstName: telegramData.telegram_first_name,
        lastName: telegramData.telegram_last_name,
        photoUrl: telegramData.telegram_photo_url
      }
    });
  } catch (error) {
    console.error('Telegram status error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
