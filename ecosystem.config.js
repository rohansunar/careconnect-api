module.exports = {
  apps: [
    {
      name: 'api-v2',
      script: 'dist/src/main.js',
      instances: '1', // Use all available CPU cores
    //   exec_mode: 'cluster', // Enable clustering
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        SCHEDULER_DISABLE: 'true' 
      },
      // Logging options
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Auto-restart on crashes
      autorestart: true,
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      // Additional deployment settings
      watch: false, // Disable watching in production
      ignore_watch: ['node_modules', 'logs'],
      env_production: {
        NODE_ENV: 'production',
        // Add other production-specific env vars here if needed
      },
    },
  ],
};