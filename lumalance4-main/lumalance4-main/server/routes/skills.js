const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth, admin } = require('../middleware/auth');
const router = express.Router();
const slugify = require('slugify');

/**
 * @route   GET /api/skills
 * @desc    Get all skills
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let sql = `
      SELECT s.*, c.name as category_name, c.slug as category_slug,
        COUNT(DISTINCT ps.project_id) as project_count,
        COUNT(DISTINCT us.user_id) as user_count
      FROM skills s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN project_skills ps ON s.id = ps.skill_id
      LEFT JOIN user_skills us ON s.id = us.skill_id
    `;
    
    const queryParams = [];
    
    // Filter by category if provided
    if (category_id) {
      sql += ` WHERE s.category_id = $1`;
      queryParams.push(category_id);
    }
    
    sql += `
      GROUP BY s.id, c.name, c.slug
      ORDER BY s.name ASC
    `;
    
    const result = await query(sql, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/skills/:id
 * @desc    Get skill by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get skill with category
    const skillResult = await query(`
      SELECT s.*, c.name as category_name, c.slug as category_slug
      FROM skills s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = $1
    `, [id]);
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    const skill = skillResult.rows[0];
    
    // Get project count
    const projectCountResult = await query(`
      SELECT COUNT(DISTINCT ps.project_id) as count
      FROM project_skills ps
      WHERE ps.skill_id = $1
    `, [id]);
    
    // Get user count
    const userCountResult = await query(`
      SELECT COUNT(DISTINCT us.user_id) as count
      FROM user_skills us
      WHERE us.skill_id = $1
    `, [id]);
    
    res.json({
      ...skill,
      project_count: parseInt(projectCountResult.rows[0].count),
      user_count: parseInt(userCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/skills/slug/:slug
 * @desc    Get skill by slug
 * @access  Public
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get skill with category
    const skillResult = await query(`
      SELECT s.*, c.name as category_name, c.slug as category_slug
      FROM skills s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.slug = $1
    `, [slug]);
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    const skill = skillResult.rows[0];
    
    // Get project count
    const projectCountResult = await query(`
      SELECT COUNT(DISTINCT ps.project_id) as count
      FROM project_skills ps
      WHERE ps.skill_id = $1
    `, [skill.id]);
    
    // Get user count
    const userCountResult = await query(`
      SELECT COUNT(DISTINCT us.user_id) as count
      FROM user_skills us
      WHERE us.skill_id = $1
    `, [skill.id]);
    
    res.json({
      ...skill,
      project_count: parseInt(projectCountResult.rows[0].count),
      user_count: parseInt(userCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting skill by slug:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/skills
 * @desc    Create a new skill
 * @access  Private (Admin only)
 */
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, category_id } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Generate slug
    const slug = slugify(name, { lower: true, strict: true });
    
    // Check if skill with this name or slug already exists
    const existingSkill = await query(
      'SELECT * FROM skills WHERE name = $1 OR slug = $2',
      [name, slug]
    );
    
    if (existingSkill.rows.length > 0) {
      return res.status(400).json({ message: 'Skill with this name already exists' });
    }
    
    // Check if category exists if provided
    if (category_id) {
      const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [category_id]);
      
      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }
    
    // Create skill
    const result = await query(
      `INSERT INTO skills (name, slug, category_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, category_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/skills/:id
 * @desc    Update a skill
 * @access  Private (Admin only)
 */
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id } = req.body;
    
    // Check if skill exists
    const skillResult = await query('SELECT * FROM skills WHERE id = $1', [id]);
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
      
      // Update slug if name changes
      const slug = slugify(name, { lower: true, strict: true });
      updates.push(`slug = $${paramIndex++}`);
      values.push(slug);
      
      // Check if another skill with this name or slug already exists
      const existingSkill = await query(
        'SELECT * FROM skills WHERE (name = $1 OR slug = $2) AND id != $3',
        [name, slug, id]
      );
      
      if (existingSkill.rows.length > 0) {
        return res.status(400).json({ message: 'Skill with this name already exists' });
      }
    }
    
    if (category_id !== undefined) {
      // Check if category exists if provided
      if (category_id !== null) {
        const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [category_id]);
        
        if (categoryResult.rows.length === 0) {
          return res.status(400).json({ message: 'Category not found' });
        }
      }
      
      updates.push(`category_id = $${paramIndex++}`);
      values.push(category_id);
    }
    
    // Add updated_at
    updates.push(`updated_at = NOW()`);
    
    // Add skill ID
    values.push(id);
    
    // Execute update
    const result = await query(
      `UPDATE skills
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/skills/:id
 * @desc    Delete a skill
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if skill exists
    const skillResult = await query('SELECT * FROM skills WHERE id = $1', [id]);
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    // Check if skill is being used by projects
    const projectSkillResult = await query(
      'SELECT COUNT(*) as count FROM project_skills WHERE skill_id = $1',
      [id]
    );
    
    if (parseInt(projectSkillResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete skill that is being used by projects' 
      });
    }
    
    // Check if skill is being used by users
    const userSkillResult = await query(
      'SELECT COUNT(*) as count FROM user_skills WHERE skill_id = $1',
      [id]
    );
    
    if (parseInt(userSkillResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete skill that is being used by users' 
      });
    }
    
    // Delete skill
    await query('DELETE FROM skills WHERE id = $1', [id]);
    
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/skills/user/profile
 * @desc    Get skills for the authenticated user
 * @access  Private
 */
router.get('/user/profile', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, us.proficiency_level, c.name as category_name, c.slug as category_slug
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE us.user_id = $1
      ORDER BY us.proficiency_level DESC, s.name ASC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting user skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/skills/user/profile
 * @desc    Add a skill to the authenticated user's profile
 * @access  Private
 */
router.post('/user/profile', auth, async (req, res) => {
  try {
    const { skill_id, proficiency_level } = req.body;
    
    // Validate required fields
    if (!skill_id) {
      return res.status(400).json({ message: 'Skill ID is required' });
    }
    
    // Validate proficiency level
    if (proficiency_level && (proficiency_level < 1 || proficiency_level > 5)) {
      return res.status(400).json({ 
        message: 'Proficiency level must be between 1 and 5' 
      });
    }
    
    // Check if skill exists
    const skillResult = await query('SELECT * FROM skills WHERE id = $1', [skill_id]);
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    // Check if user already has this skill
    const userSkillResult = await query(
      'SELECT * FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [req.user.id, skill_id]
    );
    
    if (userSkillResult.rows.length > 0) {
      return res.status(400).json({ 
        message: 'You already have this skill in your profile' 
      });
    }
    
    // Add skill to user profile
    const result = await query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency_level)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, skill_id, proficiency_level || 3] // Default to 3 if not provided
    );
    
    // Get skill details
    const skillDetails = await query(`
      SELECT s.*, us.proficiency_level, c.name as category_name, c.slug as category_slug
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE us.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(skillDetails.rows[0]);
  } catch (error) {
    console.error('Error adding user skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/skills/user/profile/:skill_id
 * @desc    Update a skill in the authenticated user's profile
 * @access  Private
 */
router.put('/user/profile/:skill_id', auth, async (req, res) => {
  try {
    const { skill_id } = req.params;
    const { proficiency_level } = req.body;
    
    // Validate proficiency level
    if (proficiency_level < 1 || proficiency_level > 5) {
      return res.status(400).json({ 
        message: 'Proficiency level must be between 1 and 5' 
      });
    }
    
    // Check if user has this skill
    const userSkillResult = await query(
      'SELECT * FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [req.user.id, skill_id]
    );
    
    if (userSkillResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Skill not found in your profile' 
      });
    }
    
    // Update skill proficiency
    await query(
      `UPDATE user_skills
       SET proficiency_level = $1, updated_at = NOW()
       WHERE user_id = $2 AND skill_id = $3`,
      [proficiency_level, req.user.id, skill_id]
    );
    
    // Get updated skill details
    const skillDetails = await query(`
      SELECT s.*, us.proficiency_level, c.name as category_name, c.slug as category_slug
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE us.user_id = $1 AND us.skill_id = $2
    `, [req.user.id, skill_id]);
    
    res.json(skillDetails.rows[0]);
  } catch (error) {
    console.error('Error updating user skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/skills/user/profile/:skill_id
 * @desc    Remove a skill from the authenticated user's profile
 * @access  Private
 */
router.delete('/user/profile/:skill_id', auth, async (req, res) => {
  try {
    const { skill_id } = req.params;
    
    // Check if user has this skill
    const userSkillResult = await query(
      'SELECT * FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [req.user.id, skill_id]
    );
    
    if (userSkillResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Skill not found in your profile' 
      });
    }
    
    // Remove skill from user profile
    await query(
      'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [req.user.id, skill_id]
    );
    
    res.json({ message: 'Skill removed from your profile successfully' });
  } catch (error) {
    console.error('Error removing user skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
