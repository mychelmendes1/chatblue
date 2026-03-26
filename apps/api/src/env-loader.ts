/**
 * Carrega .env antes de qualquer outro módulo.
 * Deve ser o primeiro import em server.ts para que DATABASE_URL, JWT_*, etc. existam
 * quando config/database, config/redis e routes forem carregados.
 * Compatível com tsconfig module CommonJS (sem import.meta).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';

// 1) Raiz do monorepo (apps/api/src ou apps/api/dist → três níveis acima)
const repoRootEnv = path.resolve(__dirname, '../../..', '.env');
loadEnv({ path: repoRootEnv });
// 2) .env no cwd (ex.: apps/api), sobrescreve variáveis da raiz
loadEnv({ path: path.resolve(process.cwd(), '.env'), override: true });
