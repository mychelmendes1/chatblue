#!/bin/sh
set -e
cd /app/apps/api
npx prisma@5.22.0 migrate deploy || echo "Warning: migrate deploy failed, starting server anyway."
cd /app
exec node apps/api/dist/server.js
