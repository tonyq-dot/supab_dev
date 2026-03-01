const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   GET /api/points/balance
 * @desc    Get user's point balance and statistics
 * @access  Private
 */
router.get('/balance', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM user_points WHERE user_id = $1
    `, [req.user.id]);
    
    if (result.rows.length === 0) {
      // Create initial balance record
      await query(`
        INSERT INTO user_points (user_id, balance, total_earned, total_spent)
        VALUES ($1, 0, 0, 0)
      `, [req.user.id]);
      
      res.json({
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error getting point balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/points/transactions
 * @desc    Get user's point transaction history
 * @access  Private
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT pt.*, 
        from_user.email as from_email,
        from_profile.display_name as from_name,
        to_user.email as to_email,
        to_profile.display_name as to_name
      FROM point_transactions pt
      LEFT JOIN users from_user ON pt.from_user_id = from_user.id
      LEFT JOIN profiles from_profile ON from_user.id = from_profile.user_id
      LEFT JOIN users to_user ON pt.to_user_id = to_user.id
      LEFT JOIN profiles to_profile ON to_user.id = to_profile.user_id
      WHERE (pt.from_user_id = $1 OR pt.to_user_id = $1)
    `;
    
    const queryParams = [req.user.id];
    let paramIndex = 2;
    
    if (type) {
      sql += ` AND pt.transaction_type = $${paramIndex++}`;
      queryParams.push(type);
    }
    
    sql += ` ORDER BY pt.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const result = await query(sql, queryParams);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM point_transactions 
      WHERE (from_user_id = $1 OR to_user_id = $1)
    `;
    const countParams = [req.user.id];
    
    if (type) {
      countSql += ` AND transaction_type = $2`;
      countParams.push(type);
    }
    
    const countResult = await query(countSql, countParams);
    
    res.json({
      transactions: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/points/achievements
 * @desc    Get available achievements and user's earned achievements
 * @access  Private
 */
router.get('/achievements', auth, async (req, res) => {
  try {
    // Get all achievements
    const achievementsResult = await query(`
      SELECT * FROM point_achievements WHERE is_active = true ORDER BY points_reward ASC
    `);
    
    // Get user's earned achievements
    const userAchievementsResult = await query(`
      SELECT ua.*, pa.name, pa.description, pa.points_reward, pa.icon, pa.rarity
      FROM user_achievements ua
      JOIN point_achievements pa ON ua.achievement_id = pa.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `, [req.user.id]);
    
    // Mark which achievements user has earned
    const earnedIds = userAchievementsResult.rows.map(ua => ua.achievement_id);
    const achievements = achievementsResult.rows.map(achievement => ({
      ...achievement,
      earned: earnedIds.includes(achievement.id),
      earned_at: userAchievementsResult.rows.find(ua => ua.achievement_id === achievement.id)?.earned_at
    }));
    
    res.json({
      achievements,
      earned_achievements: userAchievementsResult.rows,
      total_earned: userAchievementsResult.rows.length,
      total_available: achievementsResult.rows.length
    });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/points/transfer
 * @desc    Transfer points to another user
 * @access  Private
 */
router.post('/transfer', auth, async (req, res) => {
  try {
    const { to_user_id, amount, message } = req.body;
    
    if (!to_user_id || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer parameters' });
    }
    
    if (to_user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot transfer points to yourself' });
    }
    
    // Check if recipient exists
    const recipientCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [to_user_id]
    );
    
    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Transfer points using database function
    const result = await query(`
      SELECT transfer_points($1, $2, $3, $4) as transaction_hash
    `, [req.user.id, to_user_id, amount, JSON.stringify({ message })]);
    
    if (result.rows[0].transaction_hash) {
      res.json({
        success: true,
        transaction_hash: result.rows[0].transaction_hash,
        message: 'Points transferred successfully'
      });
    } else {
      res.status(400).json({ message: 'Transfer failed' });
    }
  } catch (error) {
    console.error('Error transferring points:', error);
    if (error.message === 'Insufficient balance') {
      res.status(400).json({ message: 'Insufficient balance' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

/**
 * @route   GET /api/points/leaderboard
 * @desc    Get points leaderboard
 * @access  Private
 */
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT up.balance, up.total_earned, up.total_spent,
             u.email, p.display_name, p.avatar_url
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY up.balance DESC, up.total_earned DESC
      LIMIT $1
    `, [limit]);
    
    // Calculate user's rank
    const userRankResult = await query(`
      SELECT rank FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY balance DESC, total_earned DESC) as rank
        FROM user_points
      ) ranked_users
      WHERE user_id = $1
    `, [req.user.id]);
    
    const user_rank = userRankResult.rows.length > 0 ? userRankResult.rows[0].rank : null;
    
    res.json({
      leaderboard: result.rows,
      user_rank: user_rank
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/points/mint
 * @desc    Mint points for achievement (admin/system use)
 * @access  Private
 */
router.post('/mint', auth, async (req, res) => {
  try {
    const { user_id, amount, transaction_type, reference_id, reference_type, metadata } = req.body;
    
    // Admin check or achievement system integration
    if (!req.user.is_admin && transaction_type !== 'milestone_completion') {
      return res.status(403).json({ message: 'Unauthorized minting' });
    }
    
    const result = await query(`
      SELECT mint_points($1, $2, $3, $4, $5, $6) as transaction_hash
    `, [user_id, amount, transaction_type, reference_id, reference_type, metadata]);
    
    if (result.rows[0].transaction_hash) {
      res.json({
        success: true,
        transaction_hash: result.rows[0].transaction_hash,
        message: 'Points minted successfully'
      });
    } else {
      res.status(400).json({ message: 'Minting failed' });
    }
  } catch (error) {
    console.error('Error minting points:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/points/check-achievements
 * @desc    Check and award achievements for user
 * @access  Private
 */
router.post('/check-achievements', auth, async (req, res) => {
  try {
    const { achievement_type, criteria } = req.body;
    
    // Get user's current stats
    const userStats = await getUserStats(req.user.id);
    
    // Get achievements that match the criteria
    const achievementsResult = await query(`
      SELECT * FROM point_achievements 
      WHERE achievement_type = $1 AND is_active = true
    `, [achievement_type]);
    
    const newAchievements = [];
    
    for (const achievement of achievementsResult.rows) {
      // Check if user already has this achievement
      const existingResult = await query(`
        SELECT id FROM user_achievements 
        WHERE user_id = $1 AND achievement_id = $2
      `, [req.user.id, achievement.id]);
      
      if (existingResult.rows.length === 0) {
        // Check if user meets criteria
        if (checkAchievementCriteria(achievement.criteria, userStats)) {
          // Award achievement
          const transactionHash = await awardAchievement(req.user.id, achievement);
          newAchievements.push({
            ...achievement,
            transaction_hash: transactionHash
          });
        }
      }
    }
    
    res.json({
      new_achievements: newAchievements,
      total_awarded: newAchievements.length
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get user stats
async function getUserStats(userId) {
  const stats = {};
  
  // Get milestone completion count
  const milestoneResult = await query(`
    SELECT COUNT(*) as count FROM milestones 
    WHERE created_by = $1 AND status = 'completed'
  `, [userId]);
  stats.milestone_count = parseInt(milestoneResult.rows[0].count);
  
  // Get total earnings
  const earningsResult = await query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE payee_id = $1 AND status = 'paid'
  `, [userId]);
  stats.total_earnings = parseFloat(earningsResult.rows[0].total);
  
  // Get message count
  const messageResult = await query(`
    SELECT COUNT(*) as count FROM messages WHERE sender_id = $1
  `, [userId]);
  stats.message_count = parseInt(messageResult.rows[0].count);
  
  return stats;
}

// Helper function to check achievement criteria
function checkAchievementCriteria(criteria, userStats) {
  if (!criteria) return false;
  
  for (const [key, value] of Object.entries(criteria)) {
    if (userStats[key] < value) {
      return false;
    }
  }
  
  return true;
}

// Helper function to award achievement
async function awardAchievement(userId, achievement) {
  const result = await query(`
    SELECT mint_points($1, $2, $3, $4, $5, $6) as transaction_hash
  `, [userId, achievement.points_reward, 'achievement', achievement.id, 'achievement', null]);
  
  const transactionHash = result.rows[0].transaction_hash;
  
  // Record user achievement
  await query(`
    INSERT INTO user_achievements (user_id, achievement_id, transaction_hash)
    VALUES ($1, $2, $3)
  `, [userId, achievement.id, transactionHash]);
  
  return transactionHash;
}

module.exports = router; 