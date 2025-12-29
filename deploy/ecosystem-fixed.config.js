// PM2 Ecosystem Configuration for ChatBlue
// Localização: /opt/chatblue/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'chatblue-api',
      cwd: '/opt/chatblue/app/apps/api',
      script: 'dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        API_PORT: 3001,
        API_URL: 'http://84.247.191.105:3001',
        DATABASE_URL: 'postgresql://chatblue:0Gq7zr9QCu8mtSpx9BMIRp9PxUC1YPyk@localhost:5432/chatblue',
        REDIS_URL: 'redis://:zCW8lNtbuZAdKJ5TsRlxhefGUp7zS0I@localhost:6379',
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/chatblue/logs/api-error.log',
      out_file: '/opt/chatblue/logs/api-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: 'chatblue-web',
      cwd: '/opt/chatblue/app/apps/web',
      script: 'pnpm',
      args: 'exec next start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/chatblue/logs/web-error.log',
      out_file: '/opt/chatblue/logs/web-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
