require('dotenv').config();
console.log('DEBUG: TELEGRAM_BOT_USERNAME =', process.env.TELEGRAM_BOT_USERNAME);
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4420;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://telegram.org", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: [],
      frameSrc: ["'self'", "https://telegram.org", "https://oauth.telegram.org", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    status: 429
  },
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Import routes
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/google-auth');
const projectRoutes = require('./routes/projects');
const proposalRoutes = require('./routes/proposals');
const categoryRoutes = require('./routes/categories');
const skillRoutes = require('./routes/skills');
const userRoutes = require('./routes/users');
const telegramRoutes = require('./routes/telegram');
const messageRoutes = require('./routes/messages');
const milestoneRoutes = require('./routes/milestones');
const llmAssistantRoutes = require('./routes/llm-assistant');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const pointsRoutes = require('./routes/points');
const fiatRewardsRoutes = require('./routes/fiat-rewards');
const analyticsRoutes = require('./routes/analytics');
const whiteboardRoutes = require('./routes/whiteboards');

// API routes with rate limiting for auth
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/google', authLimiter, googleAuthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/users', userRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/llm-assistant', llmAssistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/fiat-rewards', fiatRewardsRoutes);
app.use('/api/analytics', analyticsRoutes);
// app.use('/api/whiteboards', whiteboardRoutes); // Disabled for now

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Initialize Telegram bot if token is provided
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN) { // Re-enabled
  console.log('TELEGRAM_BOT_TOKEN found, attempting to start bot...');
  try {
    const { startBot, getBotStatus } = require('./telegram');
    
    // Start bot with retry logic
    const startBotWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Attempting to start bot (attempt ${i + 1}/${retries})...`);
          const success = await startBot();
          if (success) {
            console.log('Telegram bot initialized successfully');
            return true;
          }
        } catch (error) {
          console.error(`Bot start attempt ${i + 1} failed:`, error.message);
        }
        
        if (i < retries - 1) {
          console.log(`Waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      return false;
    };
    
    // Start bot asynchronously to prevent blocking server startup
    startBotWithRetry().catch(error => {
      console.error('Failed to start Telegram bot after retries:', error.message);
      console.warn('Server will continue without Telegram bot functionality');
    });
    
    // Monitor bot status periodically
    setInterval(() => {
      const status = getBotStatus();
      if (!status.running && !status.starting) {
        console.warn('Telegram bot appears to be stopped, attempting restart...');
        startBotWithRetry().catch(error => {
          console.error('Failed to restart Telegram bot:', error.message);
        });
      }
    }, 60000); // Check every minute
    
  } catch (error) {
    console.error('Error loading Telegram bot module:', error.message);
    console.error('Full error:', error);
    console.warn('Server will continue without Telegram bot functionality');
  }
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set, bot functionality disabled');
}

// Add process monitoring
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  
  // Try to gracefully shutdown
  console.log('Attempting graceful shutdown...');
  
  // Stop Telegram bot if running
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const { stopBot } = require('./telegram');
      stopBot().catch(err => {
        console.error('Error stopping Telegram bot:', err.message);
      });
    } catch (err) {
      console.error('Error accessing Telegram bot module:', err.message);
    }
  }
  
  // Exit after a delay to allow cleanup
  setTimeout(() => {
    console.error('Forceful shutdown due to uncaught exception');
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack trace:', reason?.stack);
  
  // Don't exit on unhandled rejections, just log them
  // This prevents the server from crashing on non-critical async errors
});

// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Log memory usage if it's high
  if (memUsageMB.rss > 200 || memUsageMB.heapUsed > 150) {
    console.warn('High memory usage detected:', memUsageMB);
  }
  
  // Force garbage collection if memory is very high
  if (memUsageMB.rss > 400 && global.gc) {
    console.log('Forcing garbage collection due to high memory usage');
    global.gc();
  }
}, 30000); // Check every 30 seconds

// Start server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`API available at http://localhost:${PORT}/api`);
//   console.log(`Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
// });

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err.message);
    }
    
    // Stop Telegram bot if running
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const { stopBot } = require('./telegram');
        stopBot().then(() => {
          console.log('Telegram bot stopped successfully');
        }).catch(error => {
          console.error('Error stopping Telegram bot:', error.message);
        }).finally(() => {
          // Close database connections, etc.
          process.exit(0);
        });
      } catch (error) {
        console.error('Error loading Telegram bot module for shutdown:', error.message);
        process.exit(0);
      }
    } else {
      // Close database connections, etc.
      process.exit(0);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Keep server reference for graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
});

module.exports = app;
