/**
 * LLM Service
 * 
 * This service handles interactions with the OpenAI API for generating
 * responses to user queries about projects, tasks, and recommendations.
 */

const { OpenAI } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const embeddingService = require('./embedding-service');
const { Pool } = require('pg');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generates a response to a user query using the OpenAI API
 * 
 * @param {number} userId - The ID of the user making the query
 * @param {string} query - The user's query
 * @param {Object} additionalContext - Additional context to include in the prompt
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(userId, query, additionalContext = {}) {
  try {
    // Retrieve relevant context based on the query
    const [userProfile, relevantProjects, relevantMilestones] = await Promise.all([
      getUserProfile(userId),
      embeddingService.findSimilarProjects(query, 3),
      embeddingService.findSimilarMilestones(query, 5)
    ]);
    
    // Prepare context for the LLM
    const context = {
      user: userProfile,
      projects: relevantProjects,
      milestones: relevantMilestones,
      ...additionalContext
    };
    
    // Generate system prompt with context
    const systemPrompt = generateSystemPrompt(context);
    
    // Call the LLM
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using 3.5 to keep costs lower, can upgrade to gpt-4 for more complex queries
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const response = completion.choices[0].message.content;
    
    // Store the interaction
    await storeInteraction(userId, query, response, context);
    
    return response;
  } catch (error) {
    logger.error('Error generating LLM response:', error);
    throw new Error('Failed to generate response: ' + error.message);
  }
}

/**
 * Generates a system prompt with the given context
 * 
 * @param {Object} context - The context to include in the prompt
 * @returns {string} - The system prompt
 */
function generateSystemPrompt(context) {
  // Format user profile information
  const userInfo = context.user ? `
    Name: ${context.user.display_name || context.user.email}
    Role: ${context.user.is_admin ? 'Admin' : 'Regular User'}
    Skills: ${context.user.skills ? context.user.skills.map(s => s.name).join(', ') : 'None specified'}
  ` : 'No user profile available.';
  
  // Format project information
  const projectsInfo = context.projects && context.projects.length > 0 
    ? context.projects.map(p => `
      Project: ${p.title}
      Description: ${p.description || 'No description'}
      Status: ${p.status || 'Unknown'}
      Budget: ${p.budget || 'Not specified'}
      Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'Not specified'}
      Similarity Score: ${p.similarity ? (p.similarity * 100).toFixed(2) + '%' : 'N/A'}
    `).join('\n')
    : 'No relevant projects found.';
  
  // Format milestone information
  const milestonesInfo = context.milestones && context.milestones.length > 0
    ? context.milestones.map(m => `
      Milestone: ${m.title}
      Description: ${m.description || 'No description'}
      Due Date: ${m.due_date ? new Date(m.due_date).toLocaleDateString() : 'Not specified'}
      Status: ${m.status || 'Unknown'}
      Amount: ${m.amount || 'Not specified'}
      Project ID: ${m.project_id}
      Similarity Score: ${m.similarity ? (m.similarity * 100).toFixed(2) + '%' : 'N/A'}
    `).join('\n')
    : 'No relevant milestones found.';
  
  // Include any specific project if provided
  const specificProjectInfo = context.specificProject 
    ? `
      SPECIFIC PROJECT DETAILS:
      Project: ${context.specificProject.title}
      Description: ${context.specificProject.description || 'No description'}
      Status: ${context.specificProject.status || 'Unknown'}
      Budget: ${context.specificProject.budget || 'Not specified'}
      Deadline: ${context.specificProject.deadline ? new Date(context.specificProject.deadline).toLocaleDateString() : 'Not specified'}
    `
    : '';
  
  // Generate the complete system prompt
  return `You are an AI assistant for the LumaLance freelance platform. 
  You help users understand their projects, tasks, and provide recommendations.
  
  USER PROFILE:
  ${userInfo}
  
  RELEVANT PROJECTS:
  ${projectsInfo}
  
  RELEVANT MILESTONES/TASKS:
  ${milestonesInfo}
  
  ${specificProjectInfo}
  
  ${context.recommendationType === 'daily' ? 'The user is asking for daily task recommendations. Focus on prioritizing their tasks based on deadlines, status, and importance.' : ''}
  
  Your goal is to provide helpful, accurate information about projects and tasks,
  and to suggest what the user should prioritize next. Be concise but thorough.
  
  Always format your responses in a clear, organized manner using markdown formatting.
  Use bullet points, headers, and emphasis where appropriate to make your response easy to read.`;
}

/**
 * Retrieves a user's profile and skills
 * 
 * @param {number} userId - The ID of the user
 * @returns {Promise<Object>} - The user profile
 */
async function getUserProfile(userId) {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.is_admin,
             p.display_name, p.first_name, p.last_name, p.bio, p.location,
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
      WHERE u.id = $1
      GROUP BY u.id, p.id
    `, [userId]);
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error retrieving user profile for user ${userId}:`, error);
    throw new Error('Failed to retrieve user profile: ' + error.message);
  }
}

/**
 * Stores an LLM interaction in the database
 * 
 * @param {number} userId - The ID of the user
 * @param {string} query - The user's query
 * @param {string} response - The generated response
 * @param {Object} context - The context used to generate the response
 * @returns {Promise<void>}
 */
async function storeInteraction(userId, query, response, context) {
  try {
    // Store only essential context to save space
    const essentialContext = {
      projectIds: context.projects ? context.projects.map(p => p.id) : [],
      milestoneIds: context.milestones ? context.milestones.map(m => m.id) : [],
      recommendationType: context.recommendationType || null,
      specificProjectId: context.specificProject ? context.specificProject.id : null
    };
    
    await pool.query(
      `INSERT INTO llm_interactions (user_id, query, response, context)
       VALUES ($1, $2, $3, $4)`,
      [userId, query, response, JSON.stringify(essentialContext)]
    );
    
    logger.info(`Stored LLM interaction for user ${userId}`);
  } catch (error) {
    logger.error(`Error storing LLM interaction for user ${userId}:`, error);
    // Don't throw here, just log the error to prevent disrupting the response flow
  }
}

/**
 * Gets task recommendations for a user
 * 
 * @param {number} userId - The ID of the user
 * @returns {Promise<string>} - The recommendations
 */
async function getTaskRecommendations(userId) {
  return generateResponse(
    userId, 
    "What tasks should I prioritize today?",
    { recommendationType: "daily" }
  );
}

/**
 * Gets insights for a specific project
 * 
 * @param {number} userId - The ID of the user
 * @param {number} projectId - The ID of the project
 * @returns {Promise<string>} - The project insights
 */
async function getProjectInsights(userId, projectId) {
  try {
    // Get project details
    const projectResult = await pool.query(`
      SELECT p.*, 
             ARRAY_AGG(DISTINCT jsonb_build_object('id', s.id, 'name', s.name)) AS skills,
             ARRAY_AGG(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS categories
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      LEFT JOIN project_categories pc ON p.id = pc.project_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [projectId]);
    
    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }
    
    const project = projectResult.rows[0];
    
    return generateResponse(
      userId,
      "Provide insights about this project",
      { specificProject: project }
    );
  } catch (error) {
    logger.error(`Error getting project insights for project ${projectId}:`, error);
    throw new Error('Failed to get project insights: ' + error.message);
  }
}

module.exports = {
  generateResponse,
  getTaskRecommendations,
  getProjectInsights
};
