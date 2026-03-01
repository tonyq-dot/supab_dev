const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @route GET /api/milestones/project/:projectId
 * @desc Get all milestones for a project
 * @access Private
 */
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if user has access to the project
    const projectAccess = await query(`
      SELECT 
        CASE 
          WHEN p.client_id = $1 THEN 'client'
          WHEN pa.freelancer_id = $1 THEN 'freelancer'
          ELSE NULL
        END as role
      FROM projects p
      LEFT JOIN project_assignments pa ON p.id = pa.project_id AND pa.freelancer_id = $1
      WHERE p.id = $2
    `, [req.user.id, projectId]);
    
    if (projectAccess.rows.length === 0 || !projectAccess.rows[0].role) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get milestones
    const milestones = await query(`
      SELECT m.*, 
        u.email as created_by_email,
        pr.display_name as created_by_display_name
      FROM milestones m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE m.project_id = $1
      ORDER BY m.due_date ASC NULLS LAST, m.created_at ASC
    `, [projectId]);
    
    res.json({
      milestones: milestones.rows,
      user_role: projectAccess.rows[0].role
    });
  } catch (error) {
    console.error('Error getting milestones:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/milestones/:id
 * @desc Get a milestone by ID
 * @access Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get milestone with project info to check access
    const result = await query(`
      SELECT m.*, 
        p.client_id,
        pa.freelancer_id,
        u.email as created_by_email,
        pr.display_name as created_by_display_name
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      LEFT JOIN project_assignments pa ON p.id = pa.project_id
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    const milestone = result.rows[0];
    
    // Check if user has access to the milestone
    if (milestone.client_id !== req.user.id && milestone.freelancer_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      milestone,
      user_role: milestone.client_id === req.user.id ? 'client' : 'freelancer'
    });
  } catch (error) {
    console.error('Error getting milestone:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/milestones
 * @desc Create a new milestone
 * @access Private (client only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const { project_id, title, description, amount, due_date } = req.body;
    
    if (!project_id || !title || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user is the client of the project
    const projectCheck = await query(`
      SELECT client_id FROM projects WHERE id = $1
    `, [project_id]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (projectCheck.rows[0].client_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the client can create milestones' });
    }
    
    // Create milestone
    const result = await query(`
      INSERT INTO milestones (
        project_id, title, description, amount, due_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      project_id,
      title,
      description || null,
      amount,
      due_date || null,
      req.user.id
    ]);
    
    res.status(201).json({ milestone: result.rows[0] });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/milestones/:id
 * @desc Update a milestone
 * @access Private (client only)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, due_date } = req.body;
    
    // Check if milestone exists and user is the client
    const milestoneCheck = await query(`
      SELECT m.*, p.client_id
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = $1
    `, [id]);
    
    if (milestoneCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    const milestone = milestoneCheck.rows[0];
    
    // Only client can update milestone details
    if (milestone.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the client can update milestone details' });
    }
    
    // Don't allow updating completed milestones
    if (milestone.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update completed milestones' });
    }
    
    // Update milestone
    const result = await query(`
      UPDATE milestones
      SET 
        title = $1,
        description = $2,
        amount = $3,
        due_date = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      title || milestone.title,
      description !== undefined ? description : milestone.description,
      amount !== undefined ? amount : milestone.amount,
      due_date !== undefined ? due_date : milestone.due_date,
      id
    ]);
    
    res.json({ milestone: result.rows[0] });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/milestones/:id/status
 * @desc Update milestone status
 * @access Private (client or freelancer depending on status)
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if milestone exists and get project info
    const milestoneCheck = await query(`
      SELECT m.*, p.client_id, pa.freelancer_id
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      LEFT JOIN project_assignments pa ON p.id = pa.project_id
      WHERE m.id = $1
    `, [id]);
    
    if (milestoneCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    const milestone = milestoneCheck.rows[0];
    const isClient = milestone.client_id === req.user.id;
    const isFreelancer = milestone.freelancer_id === req.user.id;
    
    // Check permissions based on status change
    if (status === 'completed' && !isClient) {
      return res.status(403).json({ message: 'Only the client can mark a milestone as completed' });
    }
    
    if (status === 'in-progress' && !isFreelancer) {
      return res.status(403).json({ message: 'Only the freelancer can mark a milestone as in-progress' });
    }
    
    if (status === 'cancelled' && !isClient) {
      return res.status(403).json({ message: 'Only the client can cancel a milestone' });
    }
    
    // Don't allow changing status of completed milestones except by client to cancelled
    if (milestone.status === 'completed' && !(isClient && status === 'cancelled')) {
      return res.status(400).json({ message: 'Cannot change status of completed milestones' });
    }
    
    // Update milestone status
    const result = await transaction(async (client) => {
      // Update milestone status
      const updateResult = await client.query(`
        UPDATE milestones
        SET 
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [status, id]);
      
      // If milestone is completed, award rewards for the freelancer
      if (status === 'completed' && updateResult.rows.length > 0) {
        const completedMilestone = updateResult.rows[0];
        
        // Calculate points based on milestone amount (1 point per $1)
        const pointsToMint = Math.floor(completedMilestone.amount);
        
        // Mint points for milestone completion
        await client.query(`
          SELECT mint_points($1, $2, $3, $4, $5, $6)
        `, [
          milestone.freelancer_id,
          pointsToMint,
          'milestone_completion',
          completedMilestone.id,
          'milestone',
          JSON.stringify({ milestone_title: completedMilestone.title, project_id: completedMilestone.project_id })
        ]);
        
        // Award fiat rewards for milestone completion
        // Check for "First Milestone" achievement (category_id = 1)
        await client.query(`
          SELECT award_fiat_reward($1, $2, $3, $4, $5)
        `, [
          milestone.freelancer_id,
          1, // First Milestone category
          completedMilestone.id,
          'milestone',
          JSON.stringify({ milestone_title: completedMilestone.title, project_id: completedMilestone.project_id })
        ]);
        
        // Check for other milestone-based achievements
        const userStats = await getUserStats(milestone.freelancer_id);
        
        // Check for "Milestone Master" (10 milestones)
        if (userStats.milestone_count >= 10) {
          await client.query(`
            SELECT award_fiat_reward($1, $2, $3, $4, $5)
          `, [
            milestone.freelancer_id,
            2, // Milestone Master category
            completedMilestone.id,
            'milestone',
            JSON.stringify({ milestone_title: completedMilestone.title, project_id: completedMilestone.project_id })
          ]);
        }
        
        // Check for "Project Champion" (50 milestones)
        if (userStats.milestone_count >= 50) {
          await client.query(`
            SELECT award_fiat_reward($1, $2, $3, $4, $5)
          `, [
            milestone.freelancer_id,
            3, // Project Champion category
            completedMilestone.id,
            'milestone',
            JSON.stringify({ milestone_title: completedMilestone.title, project_id: completedMilestone.project_id })
          ]);
        }
      }
      
      return updateResult.rows[0];
    });
    
    res.json({ milestone: result });
  } catch (error) {
    console.error('Error updating milestone status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/milestones/:id
 * @desc Delete a milestone
 * @access Private (client only)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if milestone exists and user is the client
    const milestoneCheck = await query(`
      SELECT m.*, p.client_id
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = $1
    `, [id]);
    
    if (milestoneCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    const milestone = milestoneCheck.rows[0];
    
    // Only client can delete milestones
    if (milestone.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the client can delete milestones' });
    }
    
    // Don't allow deleting completed milestones
    if (milestone.status === 'completed') {
      return res.status(400).json({ message: 'Cannot delete completed milestones' });
    }
    
    // Delete milestone
    await query(`DELETE FROM milestones WHERE id = $1`, [id]);
    
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
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
  
  return stats;
}

module.exports = router;
