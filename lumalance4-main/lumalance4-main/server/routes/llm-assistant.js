/**
 * LLM Assistant Routes
 * 
 * API routes for the LLM assistant functionality
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const llmService = require('../services/llm-service');
const embeddingService = require('../services/embedding-service');
const router = express.Router();
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting middleware to control API costs
// Limit each user to 20 requests per hour
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => req.user.id.toString(), // Use user ID as the key
});

/**
 * @route   POST /api/llm-assistant/query
 * @desc    Get a response to a general query
 * @access  Private
 */
router.post('/query', auth, apiLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    logger.info(`Processing LLM query for user ${userId}: ${query.substring(0, 50)}...`);
    
    const response = await llmService.generateResponse(userId, query);
    
    res.json({ response });
  } catch (error) {
    logger.error('Error in LLM query:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/llm-assistant/recommendations
 * @desc    Get task recommendations
 * @access  Private
 */
router.get('/recommendations', auth, apiLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info(`Getting task recommendations for user ${userId}`);
    
    const recommendations = await llmService.getTaskRecommendations(userId);
    
    res.json({ recommendations });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/llm-assistant/project-insights/:projectId
 * @desc    Get insights for a specific project
 * @access  Private
 */
router.get('/project-insights/:projectId', auth, apiLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({ message: 'Valid project ID is required' });
    }
    
    logger.info(`Getting project insights for project ${projectId} requested by user ${userId}`);
    
    const insights = await llmService.getProjectInsights(userId, parseInt(projectId));
    
    res.json({ insights });
  } catch (error) {
    logger.error('Error getting project insights:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/llm-assistant/update-embeddings
 * @desc    Update all embeddings (admin only)
 * @access  Private/Admin
 */
router.post('/update-embeddings', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { type } = req.body;
    
    logger.info(`Admin ${req.user.id} requested embedding update for ${type || 'all'} entities`);
    
    // Start the update process asynchronously
    if (!type || type === 'all') {
      // Update all embeddings
      Promise.all([
        embeddingService.updateAllProjectEmbeddings(),
        embeddingService.updateAllMilestoneEmbeddings(),
        embeddingService.updateAllUserEmbeddings()
      ]).catch(error => {
        logger.error('Error in background embedding update:', error);
      });
      
      res.json({ message: 'Embedding update started for all entities' });
    } else if (type === 'projects') {
      // Update only project embeddings
      embeddingService.updateAllProjectEmbeddings()
        .catch(error => {
          logger.error('Error in background project embedding update:', error);
        });
      
      res.json({ message: 'Project embedding update started' });
    } else if (type === 'milestones') {
      // Update only milestone embeddings
      embeddingService.updateAllMilestoneEmbeddings()
        .catch(error => {
          logger.error('Error in background milestone embedding update:', error);
        });
      
      res.json({ message: 'Milestone embedding update started' });
    } else if (type === 'users') {
      // Update only user embeddings
      embeddingService.updateAllUserEmbeddings()
        .catch(error => {
          logger.error('Error in background user embedding update:', error);
        });
      
      res.json({ message: 'User embedding update started' });
    } else {
      return res.status(400).json({ message: 'Invalid update type' });
    }
  } catch (error) {
    logger.error('Error initiating embedding update:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
