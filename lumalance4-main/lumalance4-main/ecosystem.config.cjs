module.exports = {
  apps: [
    {
      name: 'lumalance-app',
      script: 'npm',
      args: 'run dev',
      cwd: '/var/www/lumalance4',
      watch: false,
      
      // Environment settings
      env: {
        NODE_ENV: 'development'
      },
      
      // Production environment
      env_production: {
        NODE_ENV: 'production'
      },
      
      // Logging configuration
      log_file: './logs/app.log',
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      merge_logs: true,
      time: true,
      
      // Process management
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      
      // Auto-restart settings
      autorestart: true,
      
      // Resource limits
      max_memory_restart: '500M',
      
      // Process timeouts
      kill_timeout: 10000,
      listen_timeout: 30000,
      
      // Clustering (disabled for development)
      instances: 1,
      exec_mode: 'fork',
      
      // Advanced settings
      exp_backoff_restart_delay: 100,
      vizion: false,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Process management
      shutdown_with_message: true,
      wait_ready: true,
      
      // Custom settings for development
      node_args: '--max-old-space-size=4096'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'tq',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/lumalance4.git',
      path: '/var/www/lumalance4',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production'
    }
  }
}; 