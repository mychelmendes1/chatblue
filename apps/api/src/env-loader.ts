/**
 * Carrega .env antes de qualquer outro módulo.
 * Deve ser o primeiro import em server.ts para que DATABASE_URL, JWT_*, etc. existam
 * quando config/database, config/redis e routes forem carregados.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1) apps/api/.env (sempre este primeiro)
loadEnv({ path: path.resolve(__dirname, '..', '.env') });
// 2) raiz do repo (override: false para não sobrescrever)
loadEnv({ path: path.resolve(process.cwd(), '.env'), override: false });
