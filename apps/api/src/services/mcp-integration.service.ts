import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../middlewares/error.middleware.js';

const BCRYPT_ROUNDS = 10;

/** Formato: mcp_<uuid>_<opaque> — permite localizar a linha antes do bcrypt.compare */
export function parseMcpKeyPlain(plain: string): { keyId: string; fullKey: string } | null {
  const trimmed = plain.trim();
  const m = trimmed.match(/^mcp_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(.+)$/i);
  if (!m) return null;
  return { keyId: m[1], fullKey: trimmed };
}

export async function assertUserCanScopeCompanies(
  userId: string,
  companyIds: string[]
): Promise<void> {
  const unique = [...new Set(companyIds)];
  if (unique.length === 0) {
    throw new ValidationError('Informe ao menos uma empresa');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, companyId: true, isActive: true },
  });
  if (!user?.isActive) {
    throw new ForbiddenError('Usuário inativo');
  }

  if (user.role === 'SUPER_ADMIN') {
    const companies = await prisma.company.findMany({
      where: { id: { in: unique }, isActive: true },
      select: { id: true },
    });
    if (companies.length !== unique.length) {
      throw new ValidationError('Uma ou mais empresas são inválidas ou inativas');
    }
    return;
  }

  for (const cid of unique) {
    if (cid === user.companyId) continue;
    const access = await prisma.userCompany.findFirst({
      where: { userId, companyId: cid, status: 'APPROVED' },
    });
    if (!access) {
      throw new ForbiddenError(`Sem acesso aprovado à empresa ${cid}`);
    }
  }
}

/** Papel JWT para uma empresa alvo (mesma lógica conceitual do login). */
export async function resolveRoleForCompany(
  userId: string,
  targetCompanyId: string
): Promise<{ jwtCompanyId: string; role: string; requiresCompanyQueryParam: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, companyId: true, isActive: true },
  });
  if (!user?.isActive) {
    throw new UnauthorizedError('Usuário inativo');
  }

  if (user.role === 'SUPER_ADMIN') {
    const company = await prisma.company.findFirst({
      where: { id: targetCompanyId, isActive: true },
      select: { id: true },
    });
    if (!company) {
      throw new ValidationError('Empresa não encontrada ou inativa');
    }
    return {
      jwtCompanyId: user.companyId,
      role: 'SUPER_ADMIN',
      requiresCompanyQueryParam: targetCompanyId !== user.companyId,
    };
  }

  if (targetCompanyId === user.companyId) {
    return {
      jwtCompanyId: targetCompanyId,
      role: user.role,
      requiresCompanyQueryParam: false,
    };
  }

  const access = await prisma.userCompany.findFirst({
    where: { userId, companyId: targetCompanyId, status: 'APPROVED' },
    select: { role: true },
  });
  if (!access) {
    throw new ForbiddenError('Sem acesso a esta empresa');
  }

  return {
    jwtCompanyId: targetCompanyId,
    role: access.role,
    requiresCompanyQueryParam: false,
  };
}

export async function createMcpIntegrationKey(params: {
  createdByUserId: string;
  name?: string | null;
  companyIds: string[];
}): Promise<{ id: string; plaintextKey: string }> {
  await assertUserCanScopeCompanies(params.createdByUserId, params.companyIds);

  const id = uuidv4();
  const opaque = randomBytes(24).toString('hex');
  const plaintextKey = `mcp_${id}_${opaque}`;
  const secretHash = await bcrypt.hash(plaintextKey, BCRYPT_ROUNDS);

  await prisma.mcpIntegrationKey.create({
    data: {
      id,
      name: params.name?.trim() || null,
      secretHash,
      createdByUserId: params.createdByUserId,
      companies: {
        create: params.companyIds.map((companyId) => ({ companyId })),
      },
    },
  });

  return { id, plaintextKey };
}

export async function exchangeMcpKeyForTokens(params: {
  mcpKeyPlain: string;
  companyId: string;
  clientIp?: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  allowedCompanyIds: string[];
  tokenCompanyId: string;
  requiresCompanyQueryParam: boolean;
  targetCompanyId: string;
}> {
  const parsed = parseMcpKeyPlain(params.mcpKeyPlain);
  if (!parsed) {
    throw new UnauthorizedError('Chave MCP inválida');
  }

  const record = await prisma.mcpIntegrationKey.findFirst({
    where: { id: parsed.keyId, revokedAt: null },
    include: {
      companies: { select: { companyId: true } },
      createdBy: { select: { id: true, isActive: true } },
    },
  });

  if (!record || !record.createdBy.isActive) {
    throw new UnauthorizedError('Chave MCP inválida ou revogada');
  }

  const valid = await bcrypt.compare(parsed.fullKey, record.secretHash);
  if (!valid) {
    throw new UnauthorizedError('Chave MCP inválida');
  }

  const allowedCompanyIds = record.companies.map((c) => c.companyId);
  if (!allowedCompanyIds.includes(params.companyId)) {
    throw new ForbiddenError('Empresa não autorizada para esta chave MCP');
  }

  const { jwtCompanyId, role, requiresCompanyQueryParam } = await resolveRoleForCompany(
    record.createdByUserId,
    params.companyId
  );

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured');
  }

  const payload = {
    userId: record.createdByUserId,
    companyId: jwtCompanyId,
    role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });

  try {
    await redis.setex(
      `refresh:${record.createdByUserId}:${jwtCompanyId}`,
      7 * 24 * 60 * 60,
      refreshToken
    );
  } catch (e) {
    logger.error('Redis failed storing MCP refresh token', { err: e });
  }

  logger.info('mcp_token_issued', {
    mcpKeyId: record.id,
    actorUserId: record.createdByUserId,
    companyId: params.companyId,
    jwtCompanyId,
    ip: params.clientIp,
  });

  return {
    accessToken,
    refreshToken,
    allowedCompanyIds,
    tokenCompanyId: jwtCompanyId,
    requiresCompanyQueryParam,
    targetCompanyId: params.companyId,
  };
}
