const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all whiteboards for a user (owned + shared)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT w.*, 
        u.email as owner_email,
        pr.display_name as owner_display_name,
        pr.avatar_url as owner_avatar_url,
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE wc.permission_level
        END as permission_level
      FROM whiteboards w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.owner_id = $1 OR wc.user_id = $1
      ORDER BY w.updated_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting whiteboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific whiteboard with project elements
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].permission_level === 'none') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get whiteboard details
    const whiteboardResult = await query(`
      SELECT w.*, 
        u.email as owner_email,
        pr.display_name as owner_display_name,
        pr.avatar_url as owner_avatar_url
      FROM whiteboards w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE w.id = $1
    `, [id]);
    
    // Get project elements
    const projectElementsResult = await query(`
      SELECT wpe.*, 
        p.title as project_title,
        p.description as project_description,
        p.budget as project_budget,
        p.deadline as project_deadline,
        p.status as project_status,
        pc.email as client_email,
        pcpr.display_name as client_display_name,
        pcpr.avatar_url as client_avatar_url
      FROM whiteboard_project_elements wpe
      JOIN projects p ON wpe.project_id = p.id
      LEFT JOIN users pc ON p.client_id = pc.id
      LEFT JOIN profiles pcpr ON pc.id = pcpr.user_id
      WHERE wpe.whiteboard_id = $1
    `, [id]);
    
    // Get collaborators
    const collaboratorsResult = await query(`
      SELECT wc.*, 
        u.email,
        pr.display_name,
        pr.avatar_url
      FROM whiteboard_collaborators wc
      JOIN users u ON wc.user_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE wc.whiteboard_id = $1
    `, [id]);
    
    res.json({
      ...whiteboardResult.rows[0],
      project_elements: projectElementsResult.rows,
      collaborators: collaboratorsResult.rows,
      current_user_permission: permissionCheck.rows[0].permission_level
    });
  } catch (error) {
    console.error('Error getting whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new whiteboard
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, is_public = false } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const result = await query(`
      INSERT INTO whiteboards (title, description, owner_id, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, description, req.user.id, is_public]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update whiteboard
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, excalidraw_data, is_public } = req.body;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    const permission = permissionCheck.rows[0]?.permission_level;
    if (!permission || permission === 'none' || permission === 'view') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    
    if (excalidraw_data !== undefined) {
      updates.push(`excalidraw_data = $${paramIndex++}`);
      values.push(JSON.stringify(excalidraw_data));
    }
    
    if (is_public !== undefined && permission === 'owner') {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(is_public);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    
    values.push(id);
    const result = await query(`
      UPDATE whiteboards
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add project to whiteboard
router.post('/:id/projects', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, excalidraw_element_id, position_x, position_y } = req.body;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    const permission = permissionCheck.rows[0]?.permission_level;
    if (!permission || permission === 'none' || permission === 'view') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Verify project exists and user has access
    const projectCheck = await query(`
      SELECT id FROM projects 
      WHERE id = $1 AND (is_public = true OR client_id = $2)
    `, [project_id, req.user.id]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }
    
    // Add project element
    const result = await query(`
      INSERT INTO whiteboard_project_elements 
      (whiteboard_id, project_id, excalidraw_element_id, position_x, position_y)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, project_id, excalidraw_element_id, position_x, position_y]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding project to whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove project from whiteboard
router.delete('/:id/projects/:elementId', auth, async (req, res) => {
  try {
    const { id, elementId } = req.params;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    const permission = permissionCheck.rows[0]?.permission_level;
    if (!permission || permission === 'none' || permission === 'view') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await query(`
      DELETE FROM whiteboard_project_elements 
      WHERE whiteboard_id = $1 AND excalidraw_element_id = $2
    `, [id, elementId]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing project from whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's projects for whiteboard
router.get('/:id/available-projects', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    const permission = permissionCheck.rows[0]?.permission_level;
    if (!permission || permission === 'none') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get projects user has access to (exclude those already on whiteboard)
    const result = await query(`
      SELECT p.*, 
        u.email as client_email,
        pr.display_name as client_display_name,
        pr.avatar_url as client_avatar_url
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE (p.is_public = true OR p.client_id = $1)
      AND p.id NOT IN (
        SELECT project_id 
        FROM whiteboard_project_elements 
        WHERE whiteboard_id = $2
      )
      ORDER BY p.updated_at DESC
    `, [req.user.id, id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting available projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 