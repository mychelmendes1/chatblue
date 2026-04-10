import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import {
  assertUserCanScopeCompanies,
  createMcpIntegrationKey,
  exchangeMcpKeyForTokens,
  parseMcpKeyPlain,
} from '../services/mcp-integration.service.js';

const router = Router();

const mcpPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many MCP requests, try again later.' },
});

const createKeySchema = z.object({
  name: z.string().max(120).optional(),
  companyIds: z.array(z.string().cuid()).min(1),
});

const tokenBodySchema = z.object({
  mcpKey: z.string().min(10),
  companyId: z.string().cuid(),
});

const keyInfoBodySchema = z.object({
  mcpKey: z.string().min(10),
});

/** POST /api/integrations/mcp/token — sem JWT; chave MCP + empresa */
router.post('/token', mcpPublicLimiter, async (req, res, next) => {
  try {
    const body = tokenBodySchema.parse(req.body ?? {});
    const result = await exchangeMcpKeyForTokens({
      mcpKeyPlain: body.mcpKey,
      companyId: body.companyId,
      clientIp: req.ip,
    });
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      allowedCompanyIds: result.allowedCompanyIds,
      tokenCompanyId: result.tokenCompanyId,
      requiresCompanyQueryParam: result.requiresCompanyQueryParam,
      targetCompanyId: result.targetCompanyId,
    });
  } catch (e) {
    next(e);
  }
});

/** POST /api/integrations/mcp/key-info — lista empresas permitidas (sem emitir JWT) */
router.post('/key-info', mcpPublicLimiter, async (req, res, next) => {
  try {
    const body = keyInfoBodySchema.parse(req.body ?? {});
    const parsed = parseMcpKeyPlain(body.mcpKey);
    if (!parsed) {
      return res.status(401).json({ error: 'Invalid MCP key' });
    }
    const record = await prisma.mcpIntegrationKey.findFirst({
      where: { id: parsed.keyId, revokedAt: null },
      include: {
        companies: { select: { companyId: true } },
        createdBy: { select: { isActive: true } },
      },
    });
    if (!record || !record.createdBy.isActive) {
      return res.status(401).json({ error: 'Invalid MCP key' });
    }
    const valid = await bcrypt.compare(parsed.fullKey, record.secretHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid MCP key' });
    }
    res.json({
      keyId: record.id,
      allowedCompanyIds: record.companies.map((c) => c.companyId),
    });
  } catch (e) {
    next(e);
  }
});

router.use(authenticate);

/** POST /api/integrations/mcp/keys */
router.post('/keys', async (req, res, next) => {
  try {
    const body = createKeySchema.parse(req.body ?? {});
    const { id, plaintextKey } = await createMcpIntegrationKey({
      createdByUserId: req.user!.userId,
      name: body.name,
      companyIds: body.companyIds,
    });
    res.status(201).json({
      id,
      mcpKey: plaintextKey,
      name: body.name ?? null,
      companyIds: body.companyIds,
    });
  } catch (e) {
    next(e);
  }
});

/** GET /api/integrations/mcp/keys */
router.get('/keys', async (req, res, next) => {
  try {
    const keys = await prisma.mcpIntegrationKey.findMany({
      where: { createdByUserId: req.user!.userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        companies: { select: { companyId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        companyIds: k.companies.map((c) => c.companyId),
      }))
    );
  } catch (e) {
    next(e);
  }
});

/** GET /api/integrations/mcp/keys/:id/companies */
router.get('/keys/:id', async (req, res, next) => {
  try {
    const key = await prisma.mcpIntegrationKey.findFirst({
      where: { id: req.params.id, createdByUserId: req.user!.userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        companies: { select: { companyId: true } },
      },
    });
    if (!key) throw new NotFoundError('MCP key not found');
    res.json({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      companyIds: key.companies.map((c) => c.companyId),
    });
  } catch (e) {
    next(e);
  }
});

const updateCompaniesSchema = z.object({
  companyIds: z.array(z.string().cuid()).min(1),
  name: z.string().max(120).optional().nullable(),
});

/** PUT /api/integrations/mcp/keys/:id — atualiza empresas e nome */
router.put('/keys/:id', async (req, res, next) => {
  try {
    const body = updateCompaniesSchema.parse(req.body ?? {});
    const existing = await prisma.mcpIntegrationKey.findFirst({
      where: { id: req.params.id, createdByUserId: req.user!.userId, revokedAt: null },
    });
    if (!existing) throw new NotFoundError('MCP key not found');

    await assertUserCanScopeCompanies(req.user!.userId, body.companyIds);

    await prisma.$transaction(async (tx) => {
      await tx.mcpIntegrationKeyCompany.deleteMany({
        where: { mcpIntegrationKeyId: existing.id },
      });
      await tx.mcpIntegrationKeyCompany.createMany({
        data: body.companyIds.map((companyId) => ({
          mcpIntegrationKeyId: existing.id,
          companyId,
        })),
      });
      await tx.mcpIntegrationKey.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
        },
      });
    });

    res.json({ id: existing.id, companyIds: body.companyIds, name: body.name ?? existing.name });
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/integrations/mcp/keys/:id — revoga */
router.delete('/keys/:id', async (req, res, next) => {
  try {
    const updated = await prisma.mcpIntegrationKey.updateMany({
      where: { id: req.params.id, createdByUserId: req.user!.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundError('MCP key not found');
    res.json({ revoked: true });
  } catch (e) {
    next(e);
  }
});

export const mcpIntegrationRouter = router;
