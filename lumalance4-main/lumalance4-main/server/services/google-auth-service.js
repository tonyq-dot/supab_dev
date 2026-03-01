/**
 * Google OAuth Service
 * 
 * This service handles Google OAuth authentication and integrates
 * with the existing user system.
 */

const { OAuth2Client } = require('google-auth-library');
const { query, transaction } = require('../database/connection');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Verify Google ID token
 * @param {string} idToken - Google ID token
 * @returns {Promise<Object>} - Google user data
 */
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    return {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw new Error('Invalid Google token');
  }
}

/**
 * Find or create user from Google data
 * @param {Object} googleData - Google user data
 * @returns {Promise<Object>} - User data with tokens
 */
async function findOrCreateGoogleUser(googleData) {
  try {
    // Check if user exists with this Google ID
    const existingGoogleUser = await query(
      'SELECT u.*, p.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.google_id = $1',
      [googleData.googleId]
    );

    if (existingGoogleUser.rows.length > 0) {
      const user = existingGoogleUser.rows[0];
      return await generateAuthTokens(user.id);
    }

    // Check if user exists with this email
    const existingEmailUser = await query(
      'SELECT u.*, p.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.email = $1',
      [googleData.email]
    );

    if (existingEmailUser.rows.length > 0) {
      // Link Google account to existing email user
      const user = existingEmailUser.rows[0];
      await query(
        'UPDATE users SET google_id = $1 WHERE id = $2',
        [googleData.googleId, user.id]
      );
      return await generateAuthTokens(user.id);
    }

    // Create new user
    const userId = await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, google_id, is_active) VALUES ($1, $2, $3) RETURNING id',
        [googleData.email, googleData.googleId, true]
      );
      
      const newUserId = userResult.rows[0].id;
      
      // Create profile
      await client.query(
        'INSERT INTO profiles (user_id, first_name, last_name, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5)',
        [
          newUserId,
          googleData.firstName || null,
          googleData.lastName || null,
          `${googleData.firstName || ''} ${googleData.lastName || ''}`.trim(),
          googleData.picture || null
        ]
      );
      
      return newUserId;
    });

    return await generateAuthTokens(userId);
  } catch (error) {
    console.error('Error finding/creating Google user:', error);
    throw new Error('Failed to process Google authentication');
  }
}

/**
 * Generate JWT and refresh tokens for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Tokens and user data
 */
async function generateAuthTokens(userId) {
  try {
    // Get user data
    const userResult = await query(
      'SELECT u.*, p.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
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
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store refresh token
    await transaction(async (client) => {
      // Delete any existing refresh tokens for this user
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
      
      // Insert new refresh token
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, refreshToken, expiresAt]
      );
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        profile: {
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        }
      }
    };
  } catch (error) {
    console.error('Error generating auth tokens:', error);
    throw new Error('Failed to generate authentication tokens');
  }
}

/**
 * Get Google OAuth URL for frontend
 * @returns {string} - Google OAuth URL
 */
function getGoogleAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}

module.exports = {
  verifyGoogleToken,
  findOrCreateGoogleUser,
  generateAuthTokens,
  getGoogleAuthUrl
}; 