const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Import Telegram notification functions if available
let telegramNotifications = null;
try {
  telegramNotifications = require('../telegram/notifications');
} catch (error) {
  console.log('Telegram notifications not available:', error.message);
}

// Import notification service
const NotificationService = require('../services/notification-service');

/**
 * @route   GET /api/proposals
 * @desc    Get proposals for a project (for project owner)
 * @access  Private
 */
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    // Check if user is the project owner
    const projectResult = await query(
      'SELECT client_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (projectResult.rows[0].client_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build query
    let sql = `
      SELECT p.*, 
        u.email as freelancer_email,
        pr.first_name as freelancer_first_name,
        pr.last_name as freelancer_last_name,
        pr.display_name as freelancer_display_name,
        pr.avatar_url as freelancer_avatar_url
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      JOIN profiles pr ON u.id = pr.user_id
      WHERE p.project_id = $1
    `;

    const queryParams = [projectId];
    let paramIndex = 2;

    // Filter by status if provided
    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Add sorting
    sql += ` ORDER BY p.created_at DESC`;

    // Add pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(sql, queryParams);

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM proposals WHERE project_id = $1 ${
        status ? 'AND status = $2' : ''
      }`,
      status ? [projectId, status] : [projectId]
    );

    res.json({
      proposals: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Error getting proposals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/proposals/user
 * @desc    Get proposals submitted by the authenticated user
 * @access  Private
 */
router.get('/user', auth, async (req, res) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;

    // Build query
    let sql = `
      SELECT p.*, 
        pr.title as project_title,
        pr.slug as project_slug,
        pr.description as project_description,
        pr.budget as project_budget,
        pr.deadline as project_deadline,
        pr.status as project_status,
        u.email as client_email,
        pf.first_name as client_first_name,
        pf.last_name as client_last_name,
        pf.display_name as client_display_name,
        pf.avatar_url as client_avatar_url
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      JOIN users u ON pr.client_id = u.id
      JOIN profiles pf ON u.id = pf.user_id
      WHERE p.freelancer_id = $1
    `;

    const queryParams = [req.user.id];
    let paramIndex = 2;

    // Filter by status if provided
    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Add sorting
    sql += ` ORDER BY p.created_at DESC`;

    // Add pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(sql, queryParams);

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM proposals WHERE freelancer_id = $1 ${
        status ? 'AND status = $2' : ''
      }`,
      status ? [req.user.id, status] : [req.user.id]
    );

    res.json({
      proposals: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Error getting user proposals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/proposals/:id
 * @desc    Get a proposal by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get proposal with project and user details
    const result = await query(
      `
      SELECT p.*, 
        pr.title as project_title,
        pr.slug as project_slug,
        pr.description as project_description,
        pr.budget as project_budget,
        pr.deadline as project_deadline,
        pr.status as project_status,
        pr.client_id as project_client_id,
        u.email as freelancer_email,
        pf.first_name as freelancer_first_name,
        pf.last_name as freelancer_last_name,
        pf.display_name as freelancer_display_name,
        pf.avatar_url as freelancer_avatar_url,
        uc.email as client_email,
        pc.first_name as client_first_name,
        pc.last_name as client_last_name,
        pc.display_name as client_display_name,
        pc.avatar_url as client_avatar_url
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      JOIN users u ON p.freelancer_id = u.id
      JOIN profiles pf ON u.id = pf.user_id
      JOIN users uc ON pr.client_id = uc.id
      JOIN profiles pc ON uc.id = pc.user_id
      WHERE p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = result.rows[0];

    // Check if user is the freelancer or the project owner
    if (
      proposal.freelancer_id !== req.user.id &&
      proposal.project_client_id !== req.user.id &&
      !req.user.is_admin
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(proposal);
  } catch (error) {
    console.error('Error getting proposal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/proposals
 * @desc    Submit a proposal for a project
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { project_id, cover_letter, price, estimated_duration } = req.body;

    // Validate required fields
    if (!project_id || !cover_letter) {
      return res.status(400).json({
        message: 'Project ID and cover letter are required',
      });
    }

    // Check if project exists and is open for proposals
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Check if project is accepting proposals
    if (project.status !== 'active') {
      return res.status(400).json({
        message: 'This project is not currently accepting proposals',
      });
    }

    // Check if user is not the project owner
    if (project.client_id === req.user.id) {
      return res.status(400).json({
        message: 'You cannot submit a proposal to your own project',
      });
    }

    // Check if user has already submitted a proposal
    const existingProposal = await query(
      'SELECT * FROM proposals WHERE project_id = $1 AND freelancer_id = $2',
      [project_id, req.user.id]
    );

    if (existingProposal.rows.length > 0) {
      return res.status(400).json({
        message: 'You have already submitted a proposal for this project',
      });
    }

    // Create proposal
    const result = await query(
      `
      INSERT INTO proposals (
        project_id, 
        freelancer_id, 
        cover_letter, 
        price, 
        estimated_duration, 
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        project_id,
        req.user.id,
        cover_letter,
        price,
        estimated_duration,
        'pending', // Default status
      ]
    );

    const newProposal = result.rows[0];

    // Send Telegram notification to project owner if available
    if (telegramNotifications) {
      try {
        await telegramNotifications.notifyNewProposal(project_id, newProposal.id);
      } catch (notificationError) {
        console.error('Error sending Telegram notification:', notificationError.message);
        // Continue even if notification fails
      }
    }

    // Send in-app notification to project owner
    try {
      const freelancerResult = await query(
        'SELECT p.display_name FROM profiles p WHERE p.user_id = $1',
        [req.user.id]
      );
      const freelancerName = freelancerResult.rows[0]?.display_name || 'A freelancer';
      
      await NotificationService.notifyNewProposal(
        project_id,
        newProposal.id,
        freelancerName,
        project.title
      );
    } catch (notificationError) {
      console.error('Error sending in-app notification:', notificationError.message);
      // Continue even if notification fails
    }

    res.status(201).json(newProposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/proposals/:id
 * @desc    Update a proposal
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cover_letter, price, estimated_duration } = req.body;

    // Check if proposal exists and user is the owner
    const proposalResult = await query(
      'SELECT * FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Check if user is the proposal owner
    if (proposal.freelancer_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if proposal can be updated (only pending proposals can be updated)
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending proposals can be updated',
      });
    }

    // Update proposal
    const result = await query(
      `
      UPDATE proposals
      SET 
        cover_letter = COALESCE($1, cover_letter),
        price = COALESCE($2, price),
        estimated_duration = COALESCE($3, estimated_duration),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [cover_letter, price, estimated_duration, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/proposals/:id/status
 * @desc    Update proposal status (accept/reject)
 * @access  Private
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Status must be "accepted" or "rejected"',
      });
    }

    // Get proposal with project details
    const proposalResult = await query(
      `
      SELECT p.*, pr.client_id as project_client_id, pr.status as project_status
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = $1
      `,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Check if user is the project owner
    if (proposal.project_client_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if proposal is pending
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending proposals can be accepted or rejected',
      });
    }

    // Check if project is still active
    if (proposal.project_status !== 'active') {
      return res.status(400).json({
        message: 'Proposals can only be accepted for active projects',
      });
    }

    // Update proposal status using transaction
    const result = await transaction(async (client) => {
      // Update proposal status
      const updateResult = await client.query(
        `
        UPDATE proposals
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [status, id]
      );

      // If accepting proposal, create project assignment and update project status
      if (status === 'accepted') {
        // Create project assignment
        await client.query(
          `
          INSERT INTO project_assignments (
            project_id, 
            freelancer_id, 
            proposal_id, 
            status
          )
          VALUES ($1, $2, $3, $4)
          `,
          [proposal.project_id, proposal.freelancer_id, id, 'active']
        );

        // Update project status to in-progress
        await client.query(
          `
          UPDATE projects
          SET status = 'in-progress', updated_at = NOW()
          WHERE id = $1
          `,
          [proposal.project_id]
        );

        // Reject all other pending proposals for this project
        await client.query(
          `
          UPDATE proposals
          SET status = 'rejected', updated_at = NOW()
          WHERE project_id = $1 AND id != $2 AND status = 'pending'
          `,
          [proposal.project_id, id]
        );
      }

      return updateResult.rows[0];
    });

    // Send Telegram notification to freelancer if available
    if (telegramNotifications) {
      try {
        await telegramNotifications.notifyProposalStatusChange(id, status);
      } catch (notificationError) {
        console.error('Error sending Telegram notification:', notificationError.message);
        // Continue even if notification fails
      }
    }

    // Send in-app notification to freelancer
    try {
      const clientResult = await query(
        'SELECT p.display_name FROM profiles p WHERE p.user_id = $1',
        [req.user.id]
      );
      const clientName = clientResult.rows[0]?.display_name || 'The client';
      
      const projectResult = await query(
        'SELECT p.title FROM projects p JOIN proposals prop ON p.id = prop.project_id WHERE prop.id = $1',
        [id]
      );
      const projectTitle = projectResult.rows[0]?.title || 'your project';
      
      await NotificationService.notifyProposalStatusChange(id, status, clientName, projectTitle);
    } catch (notificationError) {
      console.error('Error sending in-app notification:', notificationError.message);
      // Continue even if notification fails
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating proposal status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/proposals/:id
 * @desc    Delete a proposal
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if proposal exists and user is the owner
    const proposalResult = await query(
      'SELECT * FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Check if user is the proposal owner
    if (proposal.freelancer_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if proposal can be deleted (only pending proposals can be deleted)
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending proposals can be deleted',
      });
    }

    // Delete proposal
    await query('DELETE FROM proposals WHERE id = $1', [id]);

    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
