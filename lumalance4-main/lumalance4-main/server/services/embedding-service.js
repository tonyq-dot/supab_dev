/**
 * Embedding Service
 * 
 * This service handles the creation, storage, and retrieval of vector embeddings
 * for projects, milestones, and user profiles.
 */

const { Pool } = require('pg');
const { OpenAI } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Creates an embedding vector for the given text using OpenAI's API
 * 
 * @param {string} text - The text to create an embedding for
 * @returns {Promise<number[]>} - The embedding vector
 */
async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error creating embedding:', error);
    throw new Error('Failed to create embedding: ' + error.message);
  }
}

/**
 * Stores a project embedding in the database
 * 
 * @param {number} projectId - The ID of the project
 * @param {string} content - The text content to embed
 * @returns {Promise<void>}
 */
async function storeProjectEmbedding(projectId, content) {
  try {
    const embedding = await createEmbedding(content);
    
    // Check if an embedding already exists for this project
    const checkResult = await pool.query(
      'SELECT id FROM project_embeddings WHERE project_id = $1',
      [projectId]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing embedding
      await pool.query(
        `UPDATE project_embeddings 
         SET embedding = $1, content = $2, updated_at = NOW() 
         WHERE project_id = $3`,
        [embedding, content, projectId]
      );
    } else {
      // Insert new embedding
      await pool.query(
        `INSERT INTO project_embeddings (project_id, embedding, content) 
         VALUES ($1, $2, $3)`,
        [projectId, embedding, content]
      );
    }
    
    logger.info(`Stored embedding for project ${projectId}`);
  } catch (error) {
    logger.error(`Error storing project embedding for project ${projectId}:`, error);
    throw new Error('Failed to store project embedding: ' + error.message);
  }
}

/**
 * Stores a milestone embedding in the database
 * 
 * @param {number} milestoneId - The ID of the milestone
 * @param {string} content - The text content to embed
 * @returns {Promise<void>}
 */
async function storeMilestoneEmbedding(milestoneId, content) {
  try {
    const embedding = await createEmbedding(content);
    
    // Check if an embedding already exists for this milestone
    const checkResult = await pool.query(
      'SELECT id FROM milestone_embeddings WHERE milestone_id = $1',
      [milestoneId]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing embedding
      await pool.query(
        `UPDATE milestone_embeddings 
         SET embedding = $1, content = $2, updated_at = NOW() 
         WHERE milestone_id = $3`,
        [embedding, content, milestoneId]
      );
    } else {
      // Insert new embedding
      await pool.query(
        `INSERT INTO milestone_embeddings (milestone_id, embedding, content) 
         VALUES ($1, $2, $3)`,
        [milestoneId, embedding, content]
      );
    }
    
    logger.info(`Stored embedding for milestone ${milestoneId}`);
  } catch (error) {
    logger.error(`Error storing milestone embedding for milestone ${milestoneId}:`, error);
    throw new Error('Failed to store milestone embedding: ' + error.message);
  }
}

/**
 * Stores a user embedding in the database
 * 
 * @param {number} userId - The ID of the user
 * @param {string} content - The text content to embed
 * @returns {Promise<void>}
 */
async function storeUserEmbedding(userId, content) {
  try {
    const embedding = await createEmbedding(content);
    
    // Check if an embedding already exists for this user
    const checkResult = await pool.query(
      'SELECT id FROM user_embeddings WHERE user_id = $1',
      [userId]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing embedding
      await pool.query(
        `UPDATE user_embeddings 
         SET embedding = $1, content = $2, updated_at = NOW() 
         WHERE user_id = $3`,
        [embedding, content, userId]
      );
    } else {
      // Insert new embedding
      await pool.query(
        `INSERT INTO user_embeddings (user_id, embedding, content) 
         VALUES ($1, $2, $3)`,
        [userId, embedding, content]
      );
    }
    
    logger.info(`Stored embedding for user ${userId}`);
  } catch (error) {
    logger.error(`Error storing user embedding for user ${userId}:`, error);
    throw new Error('Failed to store user embedding: ' + error.message);
  }
}

/**
 * Finds similar projects based on a query string
 * 
 * @param {string} query - The query text
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of similar projects with similarity scores
 */
async function findSimilarProjects(query, limit = 5) {
  try {
    const queryEmbedding = await createEmbedding(query);
    
    const result = await pool.query(
      `SELECT p.*, 
              1 - (pe.embedding <=> $1) as similarity
       FROM project_embeddings pe
       JOIN projects p ON pe.project_id = p.id
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryEmbedding, limit]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error finding similar projects:', error);
    throw new Error('Failed to find similar projects: ' + error.message);
  }
}

/**
 * Finds similar milestones based on a query string
 * 
 * @param {string} query - The query text
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of similar milestones with similarity scores
 */
async function findSimilarMilestones(query, limit = 5) {
  try {
    const queryEmbedding = await createEmbedding(query);
    
    const result = await pool.query(
      `SELECT m.*, 
              1 - (me.embedding <=> $1) as similarity
       FROM milestone_embeddings me
       JOIN milestones m ON me.milestone_id = m.id
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryEmbedding, limit]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error finding similar milestones:', error);
    throw new Error('Failed to find similar milestones: ' + error.message);
  }
}

/**
 * Finds users with similar skills or profiles based on a query string
 * 
 * @param {string} query - The query text
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of similar users with similarity scores
 */
async function findSimilarUsers(query, limit = 5) {
  try {
    const queryEmbedding = await createEmbedding(query);
    
    const result = await pool.query(
      `SELECT u.id, u.email, p.display_name, p.avatar_url, 
              1 - (ue.embedding <=> $1) as similarity
       FROM user_embeddings ue
       JOIN users u ON ue.user_id = u.id
       JOIN profiles p ON u.id = p.user_id
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryEmbedding, limit]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error finding similar users:', error);
    throw new Error('Failed to find similar users: ' + error.message);
  }
}

/**
 * Generates content for a project to be embedded
 * 
 * @param {Object} project - The project object
 * @returns {string} - The content to be embedded
 */
function generateProjectContent(project) {
  return `
    Project Title: ${project.title}
    Description: ${project.description || ''}
    Status: ${project.status || ''}
    Budget: ${project.budget || ''}
    Deadline: ${project.deadline ? new Date(project.deadline).toISOString() : ''}
    Skills: ${project.skills ? project.skills.map(s => s.name).join(', ') : ''}
    Categories: ${project.categories ? project.categories.map(c => c.name).join(', ') : ''}
  `;
}

/**
 * Generates content for a milestone to be embedded
 * 
 * @param {Object} milestone - The milestone object
 * @returns {string} - The content to be embedded
 */
function generateMilestoneContent(milestone) {
  return `
    Milestone Title: ${milestone.title}
    Description: ${milestone.description || ''}
    Due Date: ${milestone.due_date ? new Date(milestone.due_date).toISOString() : ''}
    Status: ${milestone.status || ''}
    Amount: ${milestone.amount || ''}
    Project ID: ${milestone.project_id}
  `;
}

/**
 * Generates content for a user to be embedded
 * 
 * @param {Object} user - The user object with profile and skills
 * @returns {string} - The content to be embedded
 */
function generateUserContent(user) {
  return `
    User: ${user.email}
    Name: ${user.profile ? (user.profile.display_name || user.profile.first_name + ' ' + user.profile.last_name) : ''}
    Bio: ${user.profile ? (user.profile.bio || '') : ''}
    Location: ${user.profile ? (user.profile.location || '') : ''}
    Skills: ${user.skills ? user.skills.map(s => `${s.name} (Level: ${s.proficiency_level})`).join(', ') : ''}
  `;
}

/**
 * Updates embeddings for all projects in the database
 * 
 * @returns {Promise<void>}
 */
async function updateAllProjectEmbeddings() {
  try {
    // Get all projects with their skills and categories
    const projectsResult = await pool.query(`
      SELECT p.*, 
             ARRAY_AGG(DISTINCT jsonb_build_object('id', s.id, 'name', s.name)) AS skills,
             ARRAY_AGG(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS categories
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      LEFT JOIN project_categories pc ON p.id = pc.project_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id
    `);
    
    for (const project of projectsResult.rows) {
      const content = generateProjectContent(project);
      await storeProjectEmbedding(project.id, content);
    }
    
    logger.info(`Updated embeddings for ${projectsResult.rows.length} projects`);
  } catch (error) {
    logger.error('Error updating all project embeddings:', error);
    throw new Error('Failed to update all project embeddings: ' + error.message);
  }
}

/**
 * Updates embeddings for all milestones in the database
 * 
 * @returns {Promise<void>}
 */
async function updateAllMilestoneEmbeddings() {
  try {
    // Get all milestones
    const milestonesResult = await pool.query(`
      SELECT * FROM milestones
    `);
    
    for (const milestone of milestonesResult.rows) {
      const content = generateMilestoneContent(milestone);
      await storeMilestoneEmbedding(milestone.id, content);
    }
    
    logger.info(`Updated embeddings for ${milestonesResult.rows.length} milestones`);
  } catch (error) {
    logger.error('Error updating all milestone embeddings:', error);
    throw new Error('Failed to update all milestone embeddings: ' + error.message);
  }
}

/**
 * Updates embeddings for all users in the database
 * 
 * @returns {Promise<void>}
 */
async function updateAllUserEmbeddings() {
  try {
    // Get all users with their profiles and skills
    const usersResult = await pool.query(`
      SELECT u.*, 
             jsonb_build_object(
               'id', p.id,
               'display_name', p.display_name,
               'first_name', p.first_name,
               'last_name', p.last_name,
               'bio', p.bio,
               'location', p.location
             ) AS profile,
             ARRAY_AGG(
               DISTINCT jsonb_build_object(
                 'id', s.id, 
                 'name', s.name, 
                 'proficiency_level', us.proficiency_level
               )
             ) AS skills
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      GROUP BY u.id, p.id
    `);
    
    for (const user of usersResult.rows) {
      const content = generateUserContent(user);
      await storeUserEmbedding(user.id, content);
    }
    
    logger.info(`Updated embeddings for ${usersResult.rows.length} users`);
  } catch (error) {
    logger.error('Error updating all user embeddings:', error);
    throw new Error('Failed to update all user embeddings: ' + error.message);
  }
}

module.exports = {
  createEmbedding,
  storeProjectEmbedding,
  storeMilestoneEmbedding,
  storeUserEmbedding,
  findSimilarProjects,
  findSimilarMilestones,
  findSimilarUsers,
  generateProjectContent,
  generateMilestoneContent,
  generateUserContent,
  updateAllProjectEmbeddings,
  updateAllMilestoneEmbeddings,
  updateAllUserEmbeddings
};
