const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   GET /api/fiat-rewards/summary
 * @desc    Get user's fiat rewards summary
 * @access  Private
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM user_rewards_summary WHERE user_id = $1
    `, [req.user.id]);
    
    if (result.rows.length === 0) {
      // Create initial summary record
      await query(`
        INSERT INTO user_rewards_summary (user_id)
        VALUES ($1)
      `, [req.user.id]);
      
      res.json({
        total_fiat_earned: 0,
        total_fiat_paid: 0,
        total_fiat_pending: 0,
        total_points_earned: 0,
        total_achievements_earned: 0,
        last_reward_at: null
      });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error getting fiat rewards summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/fiat-rewards/rewards
 * @desc    Get user's fiat rewards
 * @access  Private
 */
router.get('/rewards', auth, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT fr.*, rc.name as category_name, rc.description as category_description, rc.icon, rc.rarity
      FROM fiat_rewards fr
      JOIN reward_categories rc ON fr.category_id = rc.id
      WHERE fr.user_id = $1
    `;
    
    const queryParams = [req.user.id];
    let paramIndex = 2;
    
    if (status) {
      sql += ` AND fr.status = $${paramIndex++}`;
      queryParams.push(status);
    }
    
    sql += ` ORDER BY fr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const result = await query(sql, queryParams);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM fiat_rewards WHERE user_id = $1
    `;
    const countParams = [req.user.id];
    
    if (status) {
      countSql += ` AND status = $2`;
      countParams.push(status);
    }
    
    const countResult = await query(countSql, countParams);
    
    res.json({
      rewards: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting fiat rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/fiat-rewards/transactions
 * @desc    Get user's fiat transactions
 * @access  Private
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT * FROM fiat_transactions 
      WHERE user_id = $1
    `;
    
    const queryParams = [req.user.id];
    let paramIndex = 2;
    
    if (type) {
      sql += ` AND transaction_type = $${paramIndex++}`;
      queryParams.push(type);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const result = await query(sql, queryParams);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM fiat_transactions WHERE user_id = $1
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
    console.error('Error getting fiat transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/fiat-rewards/categories
 * @desc    Get all reward categories
 * @access  Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM reward_categories 
      WHERE is_active = true 
      ORDER BY fiat_reward ASC
    `);
    
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error getting reward categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/fiat-rewards/leaderboard
 * @desc    Get fiat rewards leaderboard
 * @access  Private
 */
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT urs.total_fiat_earned, urs.total_fiat_paid, urs.total_achievements_earned,
             u.email, p.display_name, p.avatar_url
      FROM user_rewards_summary urs
      JOIN users u ON urs.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY urs.total_fiat_earned DESC, urs.total_achievements_earned DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/fiat-rewards/award
 * @desc    Award fiat reward to user (admin/system use)
 * @access  Private
 */
router.post('/award', auth, async (req, res) => {
  try {
    const { user_id, category_id, reference_id, reference_type, metadata } = req.body;
    
    // Admin check or achievement system integration
    if (!req.user.is_admin && reference_type !== 'milestone') {
      return res.status(403).json({ message: 'Unauthorized awarding' });
    }
    
    const result = await query(`
      SELECT award_fiat_reward($1, $2, $3, $4, $5) as reward_id
    `, [user_id, category_id, reference_id, reference_type, metadata]);
    
    if (result.rows[0].reward_id) {
      res.json({
        success: true,
        reward_id: result.rows[0].reward_id,
        message: 'Fiat reward awarded successfully'
      });
    } else {
      res.status(400).json({ message: 'Awarding failed' });
    }
  } catch (error) {
    console.error('Error awarding fiat reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/fiat-rewards/:id/mark-paid
 * @desc    Mark fiat reward as paid (admin use)
 * @access  Private
 */
router.put('/:id/mark-paid', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    // Admin check
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const result = await query(`
      SELECT mark_fiat_reward_paid($1, $2) as success
    `, [id, notes]);
    
    if (result.rows[0].success) {
      res.json({
        success: true,
        message: 'Fiat reward marked as paid'
      });
    } else {
      res.status(400).json({ message: 'Failed to mark as paid' });
    }
  } catch (error) {
    console.error('Error marking fiat reward as paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/fiat-rewards/check-achievements
 * @desc    Check and award fiat rewards for user achievements
 * @access  Private
 */
router.post('/check-achievements', auth, async (req, res) => {
  try {
    const { category_type, criteria } = req.body;
    
    // Get user's current stats
    const userStats = await getUserStats(req.user.id);
    
    // Get reward categories that match the criteria
    const categoriesResult = await query(`
      SELECT * FROM reward_categories 
      WHERE category_type = $1 AND is_active = true
    `, [category_type]);
    
    const newRewards = [];
    
    for (const category of categoriesResult.rows) {
      // Check if user already has this reward
      const existingResult = await query(`
        SELECT id FROM fiat_rewards 
        WHERE user_id = $1 AND category_id = $2
      `, [req.user.id, category.id]);
      
      if (existingResult.rows.length === 0) {
        // Check if user meets criteria
        if (checkRewardCriteria(category.criteria, userStats)) {
          // Award fiat reward
          const rewardId = await awardFiatReward(req.user.id, category.id, null, category_type, null);
          if (rewardId) {
            newRewards.push({
              ...category,
              reward_id: rewardId
            });
          }
        }
      }
    }
    
    res.json({
      new_rewards: newRewards,
      total_awarded: newRewards.length
    });
  } catch (error) {
    console.error('Error checking fiat rewards:', error);
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

// Helper function to check reward criteria
function checkRewardCriteria(criteria, userStats) {
  if (!criteria) return false;
  
  for (const [key, value] of Object.entries(criteria)) {
    if (userStats[key] < value) {
      return false;
    }
  }
  
  return true;
}

// Helper function to award fiat reward
async function awardFiatReward(userId, categoryId, referenceId, referenceType, metadata) {
  const result = await query(`
    SELECT award_fiat_reward($1, $2, $3, $4, $5) as reward_id
  `, [userId, categoryId, referenceId, referenceType, metadata]);
  
  return result.rows[0].reward_id;
}

module.exports = router; 