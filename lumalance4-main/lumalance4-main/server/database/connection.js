const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool with performance optimizations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // ✅ SAFE Performance Optimizations
  max: 20, // Maximum number of connections in pool
  min: 2,  // Minimum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds to establish connection
  query_timeout: 30000, // 30 seconds query timeout
  statement_timeout: 30000, // 30 seconds statement timeout
  
  // Connection health checks
  allowExitOnIdle: process.env.NODE_ENV !== 'production'
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
    console.log('Pool configuration:', {
      max: pool.options.max,
      min: pool.options.min,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });
  }
});

// Helper function for running queries with timeout protection
const query = async (text, params) => {
  try {
    const start = Date.now();
    
    // Add query timeout wrapper for extra safety
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout exceeded')), 30000);
    });
    
    const queryPromise = pool.query(text, params);
    const res = await Promise.race([queryPromise, timeoutPromise]);
    
    const duration = Date.now() - start;
    
    // Enhanced logging for performance monitoring
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query:', { 
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''), 
        duration: `${duration}ms`,
        rows: res.rowCount,
        // Alert for slow queries
        slow: duration > 1000 ? '⚠️ SLOW QUERY' : ''
      });
    }
    
    // Log slow queries even in production
    if (duration > 5000) {
      console.warn('🐌 Very slow query detected:', {
        duration: `${duration}ms`,
        query: text.slice(0, 200) + '...'
      });
    }
    
    return res;
  } catch (error) {
    console.error('Query error:', {
      message: error.message,
      query: text?.slice(0, 100) + '...'
    });
    throw error;
  }
};

// Enhanced transaction helper with timeout
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add transaction timeout for safety
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Transaction timeout exceeded')), 45000);
    });
    
    const transactionPromise = callback(client);
    const result = await Promise.race([transactionPromise, timeoutPromise]);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ✅ NEW: Pool health monitoring function
const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: pool.options.max,
    healthStatus: pool.waitingCount === 0 ? 'healthy' : 'busy'
  };
};

// ✅ NEW: Graceful shutdown for production
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed gracefully');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

module.exports = {
  pool,
  query,
  transaction,
  getPoolStatus,
  closePool
};
