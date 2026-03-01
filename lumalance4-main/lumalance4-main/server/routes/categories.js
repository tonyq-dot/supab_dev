const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth, admin } = require('../middleware/auth');
const router = express.Router();
const slugify = require('slugify');

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(pc.project_id) as project_count
      FROM categories c
      LEFT JOIN project_categories pc ON c.id = pc.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get category
    const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = categoryResult.rows[0];
    
    // Get skills in this category
    const skillsResult = await query(`
      SELECT * FROM skills 
      WHERE category_id = $1
      ORDER BY name ASC
    `, [id]);
    
    // Get project count
    const projectCountResult = await query(`
      SELECT COUNT(DISTINCT pc.project_id) as count
      FROM project_categories pc
      WHERE pc.category_id = $1
    `, [id]);
    
    res.json({
      ...category,
      skills: skillsResult.rows,
      project_count: parseInt(projectCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get category
    const categoryResult = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = categoryResult.rows[0];
    
    // Get skills in this category
    const skillsResult = await query(`
      SELECT * FROM skills 
      WHERE category_id = $1
      ORDER BY name ASC
    `, [category.id]);
    
    // Get project count
    const projectCountResult = await query(`
      SELECT COUNT(DISTINCT pc.project_id) as count
      FROM project_categories pc
      WHERE pc.category_id = $1
    `, [category.id]);
    
    res.json({
      ...category,
      skills: skillsResult.rows,
      project_count: parseInt(projectCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting category by slug:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin only)
 */
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Generate slug
    const slug = slugify(name, { lower: true, strict: true });
    
    // Check if category with this name or slug already exists
    const existingCategory = await query(
      'SELECT * FROM categories WHERE name = $1 OR slug = $2',
      [name, slug]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }
    
    // Create category
    const result = await query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private (Admin only)
 */
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Check if category exists
    const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
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
      
      // Check if another category with this name or slug already exists
      const existingCategory = await query(
        'SELECT * FROM categories WHERE (name = $1 OR slug = $2) AND id != $3',
        [name, slug, id]
      );
      
      if (existingCategory.rows.length > 0) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    
    // Add updated_at
    updates.push(`updated_at = NOW()`);
    
    // Add category ID
    values.push(id);
    
    // Execute update
    const result = await query(
      `UPDATE categories
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if category is being used by projects
    const projectCategoryResult = await query(
      'SELECT COUNT(*) as count FROM project_categories WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(projectCategoryResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that is being used by projects' 
      });
    }
    
    // Update skills in this category to have no category
    await query(
      'UPDATE skills SET category_id = NULL WHERE category_id = $1',
      [id]
    );
    
    // Delete category
    await query('DELETE FROM categories WHERE id = $1', [id]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
