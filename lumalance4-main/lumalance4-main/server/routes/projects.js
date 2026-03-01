const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();
const slugify = require('slugify');

/**
 * @route   GET /api/projects
 * @desc    Get all projects with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      category,
      skill,
      search,
      status = 'active',
      limit = 10,
      offset = 0,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    // ✅ OPTIMIZED: Single query with JSON aggregation (fixes N+1 queries)
    let sql = `
      SELECT p.*, 
        u.email as client_email,
        pr.first_name as client_first_name,
        pr.last_name as client_last_name,
        pr.display_name as client_display_name,
        pr.avatar_url as client_avatar_url,
        COUNT(DISTINCT prop.id) as proposal_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'slug', s.slug
            )
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'
        ) as skills,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug
            )
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as categories
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      LEFT JOIN project_categories pc ON p.id = pc.project_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN proposals prop ON p.id = prop.project_id
    `;

    // Where conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Filter by status
    if (status !== 'all') {
      whereConditions.push(`p.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    // Filter by public projects
    whereConditions.push(`p.is_public = true`);

    // Search by title or description
    if (search) {
      whereConditions.push(`(p.title ILIKE $${paramIndex++} OR p.description ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Filter by category
    if (category) {
      whereConditions.push(`c.slug = $${paramIndex++}`);
      queryParams.push(category);
    }

    // Filter by skill
    if (skill) {
      whereConditions.push(`s.slug = $${paramIndex++}`);
      queryParams.push(skill);
    }

    // Add where clause if conditions exist
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Group by to avoid duplicates due to joins
    sql += ` GROUP BY p.id, u.email, pr.first_name, pr.last_name, pr.display_name, pr.avatar_url`;

    // Add sorting
    const validSortColumns = ['created_at', 'updated_at', 'title', 'budget', 'deadline'];
    const validOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order : 'desc';
    
    sql += ` ORDER BY p.${sortColumn} ${sortOrder}`;

    // Add pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(sql, queryParams);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM projects p
      ${category ? `
        LEFT JOIN project_categories pc ON p.id = pc.project_id
        LEFT JOIN categories c ON pc.category_id = c.id
      ` : ''}
      ${skill ? `
        LEFT JOIN project_skills ps ON p.id = ps.project_id
        LEFT JOIN skills s ON ps.skill_id = s.id
      ` : ''}
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams.slice(0, -2));

    // ✅ PERFORMANCE BOOST: No more N+1 queries! 
    // Skills and categories are already loaded in a single query
    const projects = result.rows;

    res.json({
      projects,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get project details
    const projectResult = await query(`
      SELECT p.*, 
        u.email as client_email,
        pr.first_name as client_first_name,
        pr.last_name as client_last_name,
        pr.display_name as client_display_name,
        pr.avatar_url as client_avatar_url
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE p.id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Check if project is public or if user is the owner
    if (!project.is_public && (!req.user || req.user.id !== project.client_id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get skills for the project
    const skillsResult = await query(`
      SELECT s.id, s.name, s.slug
      FROM skills s
      JOIN project_skills ps ON s.id = ps.skill_id
      WHERE ps.project_id = $1
    `, [id]);

    // Get categories for the project
    const categoriesResult = await query(`
      SELECT c.id, c.name, c.slug
      FROM categories c
      JOIN project_categories pc ON c.id = pc.category_id
      WHERE pc.project_id = $1
    `, [id]);

    // Get proposal count
    const proposalCountResult = await query(`
      SELECT COUNT(*) as count
      FROM proposals
      WHERE project_id = $1
    `, [id]);

    res.json({
      ...project,
      skills: skillsResult.rows,
      categories: categoriesResult.rows,
      proposal_count: parseInt(proposalCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      budget,
      deadline,
      skills = [],
      categories = [],
      is_public = true
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Generate slug from title
    let slug = slugify(title, { lower: true, strict: true });
    
    // Check if slug exists and append random string if needed
    const slugCheckResult = await query('SELECT id FROM projects WHERE slug = $1', [slug]);
    if (slugCheckResult.rows.length > 0) {
      const randomString = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomString}`;
    }

    // Create project using transaction
    const result = await transaction(async (client) => {
      // Insert project
      const projectResult = await client.query(`
        INSERT INTO projects (
          title, 
          slug, 
          description, 
          client_id, 
          budget, 
          deadline, 
          status, 
          is_public
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        title,
        slug,
        description,
        req.user.id,
        budget,
        deadline,
        'draft', // Default status
        is_public
      ]);

      const project = projectResult.rows[0];

      // Add skills
      if (skills.length > 0) {
        for (const skillId of skills) {
          await client.query(`
            INSERT INTO project_skills (project_id, skill_id)
            VALUES ($1, $2)
          `, [project.id, skillId]);
        }
      }

      // Add categories
      if (categories.length > 0) {
        for (const categoryId of categories) {
          await client.query(`
            INSERT INTO project_categories (project_id, category_id)
            VALUES ($1, $2)
          `, [project.id, categoryId]);
        }
      }

      return project;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update a project
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      budget,
      deadline,
      status,
      skills,
      categories,
      is_public
    } = req.body;

    // Check if project exists and user is the owner
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];
    
    if (project.client_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update project using transaction
    const result = await transaction(async (client) => {
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
        
        // Update slug if title changes
        const newSlug = slugify(title, { lower: true, strict: true });
        updates.push(`slug = $${paramIndex++}`);
        values.push(newSlug);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }

      if (budget !== undefined) {
        updates.push(`budget = $${paramIndex++}`);
        values.push(budget);
      }

      if (deadline !== undefined) {
        updates.push(`deadline = $${paramIndex++}`);
        values.push(deadline);
      }

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (is_public !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(is_public);
      }

      // Add project ID and execute update if there are changes
      if (updates.length > 0) {
        values.push(id);
        const updateResult = await client.query(`
          UPDATE projects
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `, values);
        
        project = updateResult.rows[0];
      }

      // Update skills if provided
      if (skills) {
        // Remove existing skills
        await client.query('DELETE FROM project_skills WHERE project_id = $1', [id]);
        
        // Add new skills
        if (skills.length > 0) {
          for (const skillId of skills) {
            await client.query(`
              INSERT INTO project_skills (project_id, skill_id)
              VALUES ($1, $2)
            `, [id, skillId]);
          }
        }
      }

      // Update categories if provided
      if (categories) {
        // Remove existing categories
        await client.query('DELETE FROM project_categories WHERE project_id = $1', [id]);
        
        // Add new categories
        if (categories.length > 0) {
          for (const categoryId of categories) {
            await client.query(`
              INSERT INTO project_categories (project_id, category_id)
              VALUES ($1, $2)
            `, [id, categoryId]);
          }
        }
      }

      return project;
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and user is the owner
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];
    
    if (project.client_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete project (cascade will handle related records)
    await query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/projects/user/client
 * @desc    Get projects created by the authenticated user
 * @access  Private
 */
router.get('/user/client', auth, async (req, res) => {
  try {
    const {
      status = 'all',
      limit = 10,
      offset = 0,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    // Base query
    let sql = `
      SELECT p.*, 
        COUNT(DISTINCT ps.skill_id) as skill_count,
        COUNT(DISTINCT prop.id) as proposal_count
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN proposals prop ON p.id = prop.project_id
      WHERE p.client_id = $1
    `;

    const queryParams = [req.user.id];
    let paramIndex = 2;

    // Filter by status
    if (status !== 'all') {
      sql += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Group by to avoid duplicates due to joins
    sql += ` GROUP BY p.id`;

    // Add sorting
    const validSortColumns = ['created_at', 'updated_at', 'title', 'budget', 'deadline', 'status'];
    const validOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order : 'desc';
    
    sql += ` ORDER BY p.${sortColumn} ${sortOrder}`;

    // Add pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(sql, queryParams);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM projects
      WHERE client_id = $1
      ${status !== 'all' ? 'AND status = $2' : ''}
    `, status !== 'all' ? [req.user.id, status] : [req.user.id]);

    // Get skills and proposals for each project
    const projects = await Promise.all(result.rows.map(async (project) => {
      const skillsResult = await query(`
        SELECT s.id, s.name, s.slug
        FROM skills s
        JOIN project_skills ps ON s.id = ps.skill_id
        WHERE ps.project_id = $1
      `, [project.id]);

      const categoriesResult = await query(`
        SELECT c.id, c.name, c.slug
        FROM categories c
        JOIN project_categories pc ON c.id = pc.category_id
        WHERE pc.project_id = $1
      `, [project.id]);

      const proposalsResult = await query(`
        SELECT COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM proposals
        WHERE project_id = $1
      `, [project.id]);

      return {
        ...project,
        skills: skillsResult.rows,
        categories: categoriesResult.rows,
        proposal_stats: proposalsResult.rows[0]
      };
    }));

    res.json({
      projects,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting client projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
