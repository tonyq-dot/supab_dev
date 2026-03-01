/**
 * Server Configuration
 * 
 * This file contains configuration settings for the server,
 * loaded from environment variables.
 */

require('dotenv').config();

module.exports = {
  // Server settings
  server: {
    port: process.env.PORT || 4420,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:4420',
  },
  
  // Database settings
  database: {
    url: process.env.DATABASE_URL || 'postgresql://luma:your_password@localhost:5432/lumalance',
    user: process.env.POSTGRES_USER || 'luma',
    password: process.env.POSTGRES_PASSWORD || 'your_password',
    database: process.env.POSTGRES_DB || 'lumalance',
  },
  
  // Authentication settings
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development_jwt_secret',
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
  },
  
  // Telegram settings
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    botId: process.env.TELEGRAM_BOT_ID,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
  },
  
  // Google OAuth settings
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  
  // OpenAI settings for LLM assistant
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-3.5-turbo',
    embeddingModel: 'text-embedding-ada-002',
  },
  
  // Rate limiting settings
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
  },
};
