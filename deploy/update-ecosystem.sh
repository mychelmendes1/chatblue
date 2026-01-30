#!/bin/bash
cd /opt/chatblue

PG_PASS=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
REDIS_PASS=$(grep REDIS_PASSWORD .env | cut -d= -f2)

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'chatblue-api',
      cwd: '/opt/chatblue/app/apps/api',
      script: 'dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue',
        REDIS_URL: 'redis://:${REDIS_PASS}@localhost:6379',
      },
      max_memory_restart: '500M',
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
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
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
EOF

pm2 delete all
pm2 start ecosystem.config.js
pm2 save

echo "=== PM2 atualizado ==="
pm2 list | head -10














