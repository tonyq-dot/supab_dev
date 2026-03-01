/**
 * User API Routes
 * 
 * This file contains routes for user management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/connection');
const { auth: authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * Get current user's profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'skill_id', us.skill_id,
            'skill_name', s.name,
            'skill_slug', s.slug,
            'proficiency_level', us.proficiency_level
          )
        ) FILTER (WHERE us.skill_id IS NOT NULL) AS skills
      FROM profiles p
      LEFT JOIN user_skills us ON p.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE p.user_id = $1
      GROUP BY p.id
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

/**
 * Update current user's profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, display_name, bio, location, website } = req.body;
    
    // Check if profile exists
    const profileCheck = await query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
    
    if (profileCheck.rows.length === 0) {
      // Create profile if it doesn't exist
      await query(`
        INSERT INTO profiles (user_id, first_name, last_name, display_name, bio, location, website)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, first_name, last_name, display_name, bio, location, website]);
    } else {
      // Update existing profile
      await query(`
        UPDATE profiles
        SET first_name = $1, last_name = $2, display_name = $3, bio = $4, location = $5, website = $6, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $7
      `, [first_name, last_name, display_name, bio, location, website, userId]);
    }
    
    // Fetch updated profile
    const result = await query(`
      SELECT * FROM profiles WHERE user_id = $1
    `, [userId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * Upload avatar for current user
 */
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const userId = req.user.id;
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Update profile with avatar URL
    await query(`
      UPDATE profiles
      SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [avatarUrl, userId]);
    
    res.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

/**
 * Get user profile by ID
 */
router.get('/:id/profile', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await query(`
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'skill_id', us.skill_id,
            'skill_name', s.name,
            'skill_slug', s.slug,
            'proficiency_level', us.proficiency_level
          )
        ) FILTER (WHERE us.skill_id IS NOT NULL) AS skills
      FROM profiles p
      LEFT JOIN user_skills us ON p.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE p.user_id = $1
      GROUP BY p.id
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

/**
 * List all users (for messaging system)
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.email,
        p.display_name,
        p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.is_active = true
      ORDER BY p.display_name, u.email
    `);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

module.exports = router;
