/**
 * Carrega .env antes de qualquer outro módulo.
 * Deve ser o primeiro import em server.ts para que DATABASE_URL, JWT_*, etc. existam
 * quando config/database, config/redis e routes forem carregados.
 * Compatível com tsconfig module CommonJS (sem import.meta).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';

// 1) .env no cwd (apps/api quando rodando da api)
loadEnv({ path: path.resolve(process.cwd(), '.env') });
// 2) raiz do repo quando em monorepo (override: false para não sobrescrever)
loadEnv({ path: path.resolve(process.cwd(), '..', '.env'), override: false });
