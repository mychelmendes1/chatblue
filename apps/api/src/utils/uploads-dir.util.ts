import path from 'path';
import fs from 'fs';

/**
 * Single source of truth for the uploads directory path.
 * Used by server (static files), upload.service, Baileys, Meta Cloud, Instagram, etc.
 * - With Docker: use UPLOADS_DIR env or /app/apps/api/uploads (volume mount).
 * - Without Docker: use UPLOADS_DIR or path from cwd so files persist and are served from the same place.
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    const dir = process.env.UPLOADS_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
  // Same fallback as server.ts and upload.service.ts for consistency
  const dir = path.join(process.cwd(), 'apps', 'api', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
