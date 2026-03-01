const express = require('express');
const router = express.Router();
const googleAuthService = require('../services/google-auth-service');

/**
 * @route GET /api/google/auth/url
 * @desc Get Google OAuth URL for frontend
 * @access Public
 */
router.get('/auth/url', (req, res) => {
  try {
    const authUrl = googleAuthService.getGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ message: 'Failed to generate auth URL' });
  }
});

/**
 * @route POST /api/google/auth/callback
 * @desc Handle Google OAuth callback with ID token
 * @access Public
 */
router.post('/auth/callback', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // Verify Google token
    const googleData = await googleAuthService.verifyGoogleToken(idToken);

    // Find or create user
    const authResult = await googleAuthService.findOrCreateGoogleUser(googleData);

    res.json({
      message: 'Google authentication successful',
      ...authResult
    });
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).json({ 
      message: error.message || 'Google authentication failed' 
    });
  }
});

/**
 * @route POST /api/google/auth/link
 * @desc Link Google account to existing user
 * @access Private
 */
router.post('/auth/link', async (req, res) => {
  try {
    const { idToken } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // Verify Google token
    const googleData = await googleAuthService.verifyGoogleToken(idToken);

    // Check if Google account is already linked to another user
    const existingGoogleUser = await query(
      'SELECT id FROM users WHERE google_id = $1 AND id != $2',
      [googleData.googleId, userId]
    );

    if (existingGoogleUser.rows.length > 0) {
      return res.status(400).json({ 
        message: 'This Google account is already linked to another user' 
      });
    }

    // Link Google account to current user
    await query(
      'UPDATE users SET google_id = $1 WHERE id = $2',
      [googleData.googleId, userId]
    );

    res.json({ message: 'Google account linked successfully' });
  } catch (error) {
    console.error('Google account linking error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to link Google account' 
    });
  }
});

/**
 * @route DELETE /api/google/auth/unlink
 * @desc Unlink Google account from user
 * @access Private
 */
router.delete('/auth/unlink', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has password (can't unlink if no other auth method)
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Don't allow unlinking if user has no password
    if (!user.password_hash) {
      return res.status(400).json({ 
        message: 'Cannot unlink Google account. Please set a password first.' 
      });
    }

    // Unlink Google account
    await query(
      'UPDATE users SET google_id = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Google account unlinked successfully' });
  } catch (error) {
    console.error('Google account unlinking error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to unlink Google account' 
    });
  }
});

module.exports = router; 