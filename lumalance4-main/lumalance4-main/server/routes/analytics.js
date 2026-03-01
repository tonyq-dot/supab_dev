const express = require('express');
const { query } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   GET /api/analytics/admin/overview
 * @desc    Get comprehensive admin overview statistics
 * @access  Private (Admin only)
 */
router.get('/admin/overview', auth, async (req, res) => {
  try {
    // Admin check
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get platform overview stats
    const platformStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE created_at >= NOW() - INTERVAL '30 days') as new_projects_30d,
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM proposals) as total_proposals,
        (SELECT COUNT(*) FROM proposals WHERE created_at >= NOW() - INTERVAL '30 days') as new_proposals_30d,
        (SELECT COUNT(*) FROM proposals WHERE status = 'accepted') as accepted_proposals,
        (SELECT COUNT(*) FROM milestones) as total_milestones,
        (SELECT COUNT(*) FROM milestones WHERE status = 'completed') as completed_milestones,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '7 days') as messages_7d
    `);

    // Get financial stats
    const financialStats = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_payments,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'due' THEN amount ELSE 0 END), 0) as total_due,
        COUNT(*) as payment_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'due' THEN 1 END) as due_count
      FROM payments
    `);

    // Get fiat rewards stats
    const fiatRewardsStats = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_fiat_awarded,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_fiat_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_fiat_pending,
        COUNT(*) as total_rewards,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_rewards,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards
      FROM fiat_rewards
    `);

    // Get points stats
    const pointsStats = await query(`
      SELECT 
        COALESCE(SUM(balance), 0) as total_points_balance,
        COALESCE(SUM(total_earned), 0) as total_points_earned,
        COALESCE(SUM(total_spent), 0) as total_points_spent,
        COUNT(*) as users_with_points
      FROM user_points
    `);

    // Get user activity stats
    const userActivityStats = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users_7d,
        COUNT(DISTINCT CASE WHEN last_activity >= NOW() - INTERVAL '30 days' THEN user_id END) as active_users_30d
      FROM (
        SELECT 
          sender_id as user_id,
          MAX(created_at) as last_activity
        FROM messages 
        GROUP BY sender_id
        UNION
        SELECT 
          created_by as user_id,
          MAX(created_at) as last_activity
        FROM milestones 
        GROUP BY created_by
        UNION
        SELECT 
          user_id,
          MAX(created_at) as last_activity
        FROM fiat_rewards 
        GROUP BY user_id
      ) user_activities
    `);

    // Get top categories
    const topCategories = await query(`
      SELECT 
        c.name,
        COUNT(pc.project_id) as project_count,
        COUNT(pr.id) as proposal_count
      FROM categories c
      LEFT JOIN project_categories pc ON c.id = pc.category_id
      LEFT JOIN projects p ON pc.project_id = p.id
      LEFT JOIN proposals pr ON p.id = pr.project_id
      GROUP BY c.id, c.name
      ORDER BY project_count DESC
      LIMIT 10
    `);

    // Get top skills
    const topSkills = await query(`
      SELECT 
        s.name,
        COUNT(ps.project_id) as project_count,
        COUNT(us.user_id) as freelancer_count
      FROM skills s
      LEFT JOIN project_skills ps ON s.id = ps.skill_id
      LEFT JOIN user_skills us ON s.id = us.skill_id
      GROUP BY s.id, s.name
      ORDER BY project_count DESC
      LIMIT 10
    `);

    // Get monthly trends (last 12 months)
    const monthlyTrends = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_users,
        COUNT(DISTINCT p.id) as new_projects,
        COUNT(DISTINCT pr.id) as new_proposals,
        COUNT(DISTINCT m.id) as new_milestones,
        COALESCE(SUM(pay.amount), 0) as total_payments
      FROM generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
        DATE_TRUNC('month', NOW()),
        '1 month'::interval
      ) as month_series
      LEFT JOIN users u ON DATE_TRUNC('month', u.created_at) = month_series
      LEFT JOIN projects p ON DATE_TRUNC('month', p.created_at) = month_series
      LEFT JOIN proposals pr ON DATE_TRUNC('month', pr.created_at) = month_series
      LEFT JOIN milestones m ON DATE_TRUNC('month', m.created_at) = month_series
      LEFT JOIN payments pay ON DATE_TRUNC('month', pay.created_at) = month_series
      GROUP BY month_series
      ORDER BY month_series
    `);

    res.json({
      platform: platformStats.rows[0],
      financial: financialStats.rows[0],
      fiatRewards: fiatRewardsStats.rows[0],
      points: pointsStats.rows[0],
      userActivity: userActivityStats.rows[0],
      topCategories: topCategories.rows,
      topSkills: topSkills.rows,
      monthlyTrends: monthlyTrends.rows
    });
  } catch (error) {
    console.error('Error getting admin overview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/analytics/freelancer/earnings
 * @desc    Get freelancer earnings estimation and statistics
 * @access  Private
 */
router.get('/freelancer/earnings', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const userId = req.user.id;

    // Get current month earnings
    const currentMonthEarnings = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_earned,
        COUNT(*) as milestone_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM payments 
      WHERE payee_id = $1 
        AND created_at >= DATE_TRUNC('month', NOW())
    `, [userId]);

    // Get last month earnings
    const lastMonthEarnings = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_earned,
        COUNT(*) as milestone_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
      FROM payments 
      WHERE payee_id = $1 
        AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND created_at < DATE_TRUNC('month', NOW())
    `, [userId]);

    // Get period earnings (last X days)
    const periodEarnings = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_earned,
        COUNT(*) as milestone_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM payments 
      WHERE payee_id = $1 
        AND created_at >= NOW() - INTERVAL '1 day' * $2
    `, [userId, period]);

    // Get fiat rewards for the period
    const fiatRewards = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_earned,
        COUNT(*) as reward_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM fiat_rewards 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '1 day' * $2
    `, [userId, period]);

    // Get upcoming payments (pending milestones)
    const upcomingPayments = await query(`
      SELECT 
        m.id,
        m.title,
        m.amount,
        m.due_date,
        p.title as project_title,
        p.id as project_id
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.created_by = $1 
        AND m.status = 'completed'
        AND m.id NOT IN (
          SELECT milestone_id FROM payments WHERE payee_id = $1 AND status = 'paid'
        )
      ORDER BY m.due_date ASC
    `, [userId]);

    // Get earnings by project
    const earningsByProject = await query(`
      SELECT 
        p.id,
        p.title,
        COALESCE(SUM(pay.amount), 0) as total_earned,
        COUNT(pay.id) as payment_count,
        COALESCE(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN pay.status = 'pending' THEN pay.amount ELSE 0 END), 0) as pending_amount
      FROM projects p
      LEFT JOIN milestones m ON p.id = m.project_id
      LEFT JOIN payments pay ON m.id = pay.milestone_id AND pay.payee_id = $1
      WHERE m.created_by = $1
      GROUP BY p.id, p.title
      ORDER BY total_earned DESC
      LIMIT 10
    `, [userId]);

    // Get monthly earnings trend (last 12 months)
    const monthlyEarningsTrend = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COALESCE(SUM(amount), 0) as total_earned,
        COUNT(*) as payment_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
      FROM payments 
      WHERE payee_id = $1 
        AND created_at >= NOW() - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `, [userId]);

    // Calculate estimated monthly earnings
    const avgDailyEarnings = periodEarnings.rows[0].total_earned / parseInt(period);
    const estimatedMonthlyEarnings = avgDailyEarnings * 30;

    // Get milestone completion rate
    const milestoneStats = await query(`
      SELECT 
        COUNT(*) as total_milestones,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_milestones,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_milestones,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_milestones
      FROM milestones 
      WHERE created_by = $1
    `, [userId]);

    const completionRate = milestoneStats.rows[0].total_milestones > 0 
      ? (milestoneStats.rows[0].completed_milestones / milestoneStats.rows[0].total_milestones) * 100 
      : 0;

    res.json({
      currentMonth: currentMonthEarnings.rows[0],
      lastMonth: lastMonthEarnings.rows[0],
      period: {
        ...periodEarnings.rows[0],
        days: parseInt(period)
      },
      fiatRewards: fiatRewards.rows[0],
      upcomingPayments: upcomingPayments.rows,
      earningsByProject: earningsByProject.rows,
      monthlyTrend: monthlyEarningsTrend.rows,
      estimates: {
        avgDailyEarnings,
        estimatedMonthlyEarnings,
        completionRate
      },
      milestoneStats: milestoneStats.rows[0]
    });
  } catch (error) {
    console.error('Error getting freelancer earnings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/analytics/freelancer/performance
 * @desc    Get freelancer performance metrics
 * @access  Private
 */
router.get('/freelancer/performance', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get project completion stats
    const projectStats = await query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects
      FROM projects p
      JOIN proposals pr ON p.id = pr.project_id
      WHERE pr.freelancer_id = $1 AND pr.status = 'accepted'
    `, [userId]);

    // Get proposal success rate
    const proposalStats = await query(`
      SELECT 
        COUNT(*) as total_proposals,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_proposals,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_proposals,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_proposals
      FROM proposals 
      WHERE freelancer_id = $1
    `, [userId]);

    // Get average milestone completion time
    const milestoneTiming = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_completion_days,
        COUNT(*) as completed_count
      FROM milestones 
      WHERE created_by = $1 AND status = 'completed'
    `, [userId]);

    // Get client satisfaction (if reviews exist)
    const clientSatisfaction = await query(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE freelancer_id = $1
    `, [userId]);

    // Get communication stats
    const communicationStats = await query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT conversation_id) as conversations,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_response_hours
      FROM messages 
      WHERE sender_id = $1
    `, [userId]);

    // Get skill utilization
    const skillUtilization = await query(`
      SELECT 
        s.name,
        COUNT(ps.project_id) as project_count,
        COUNT(DISTINCT ps.project_id) as unique_projects
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN project_skills ps ON s.id = ps.skill_id
      LEFT JOIN proposals pr ON ps.project_id = pr.project_id
      WHERE us.user_id = $1 AND pr.freelancer_id = $1 AND pr.status = 'accepted'
      GROUP BY s.id, s.name
      ORDER BY project_count DESC
      LIMIT 10
    `, [userId]);

    res.json({
      projects: projectStats.rows[0],
      proposals: {
        ...proposalStats.rows[0],
        successRate: proposalStats.rows[0].total_proposals > 0 
          ? (proposalStats.rows[0].accepted_proposals / proposalStats.rows[0].total_proposals) * 100 
          : 0
      },
      milestones: {
        ...milestoneTiming.rows[0],
        avgCompletionDays: parseFloat(milestoneTiming.rows[0].avg_completion_days || 0)
      },
      satisfaction: clientSatisfaction.rows[0],
      communication: communicationStats.rows[0],
      skills: skillUtilization.rows
    });
  } catch (error) {
    console.error('Error getting freelancer performance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 