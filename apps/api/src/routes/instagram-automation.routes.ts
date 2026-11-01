import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { InstagramService } from '../services/instagram/instagram.service.js';
import { matchAutomation } from '../services/instagram/comment-automation.matching.js';

const router = Router();

const EVENT_STATUSES = [
  'RECEIVED',
  'MATCHED',
  'REPLIED',
  'PRIVATE_SENT',
  'USER_REPLIED',
  'SKIPPED',
  'FAILED',
] as const;

const MEDIA_TYPES = ['FEED', 'REELS', 'AD', 'LIVE'] as const;

const optionalUrl = z.union([z.string().url('URL inválida'), z.literal('')]).optional();

const privateMessageSchema = z.object({
  text: z.string().min(1, 'Mensagem privada é obrigatória').max(900, 'Mensagem privada deve ter até 900 caracteres'),
  linkUrl: optionalUrl,
  buttonTitle: z.string().max(20).optional(),
  imageUrl: optionalUrl,
});

const baseAutomationSchema = z.object({
  connectionId: z.string().min(1, 'Conexão é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório').max(120),
  isActive: z.boolean().optional(),
  mediaIds: z.array(z.string().min(1)).optional(),
  mediaTypes: z.array(z.enum(MEDIA_TYPES)).optional(),
  keywords: z.array(z.string()).optional(),
  matchMode: z.enum(['contains', 'exact', 'regex']).optional(),
  excludeReplies: z.boolean().optional(),
  publicReplies: z.array(z.string().max(2200)).optional(),
  privateMessage: privateMessageSchema,
  departmentId: z.string().nullable().optional(),
  aiEnabled: z.boolean().optional(),
  oncePerUser: z.boolean().optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
});

function validateRegexKeywords(data: { matchMode?: string; keywords?: string[] }) {
  if (data.matchMode === 'regex' && data.keywords) {
    for (const k of data.keywords) {
      try {
        new RegExp(k, 'i');
      } catch {
        throw new ValidationError(`Expressão regular inválida: ${k}`);
      }
    }
  }
}

const createAutomationSchema = baseAutomationSchema;
const updateAutomationSchema = baseAutomationSchema.partial();

function cleanStrings(list?: string[]): string[] | undefined {
  if (!list) return undefined;
  return list.map((s) => s.trim()).filter((s) => s !== '');
}

function cleanPrivateMessage(pm: z.infer<typeof privateMessageSchema>) {
  const out: Record<string, string> = { text: pm.text };
  if (pm.linkUrl) out.linkUrl = pm.linkUrl;
  if (pm.buttonTitle) out.buttonTitle = pm.buttonTitle;
  if (pm.imageUrl) out.imageUrl = pm.imageUrl;
  return out;
}

function handleZod(error: unknown, next: (err?: any) => void) {
  if (error instanceof z.ZodError) {
    const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    next(new ValidationError(message || 'Dados inválidos'));
  } else {
    next(error);
  }
}

async function getInstagramConnection(companyId: string, connectionId: string) {
  const connection = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, companyId },
  });
  if (!connection) throw new NotFoundError('Conexão não encontrada');
  if (connection.type !== 'INSTAGRAM') throw new ValidationError('A conexão não é do Instagram');
  return connection;
}

async function assertDepartment(companyId: string, departmentId?: string | null) {
  if (!departmentId) return;
  const dept = await prisma.department.findFirst({ where: { id: departmentId, companyId } });
  if (!dept) throw new ValidationError('Departamento não encontrado');
}

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function parseStatus(status: unknown) {
  if (!status) return undefined;
  const s = String(status).toUpperCase();
  if (!(EVENT_STATUSES as readonly string[]).includes(s)) {
    throw new ValidationError('Status inválido');
  }
  return s as (typeof EVENT_STATUSES)[number];
}

const automationInclude = {
  connection: { select: { id: true, name: true, instagramUsername: true } },
  _count: { select: { events: true } },
} satisfies Prisma.InstagramCommentAutomationInclude;

async function listEvents(where: Prisma.InstagramCommentEventWhereInput, query: any) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.instagramCommentEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { automation: { select: { id: true, name: true } } },
    }),
    prisma.instagramCommentEvent.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ============================================
// AUTOMAÇÕES
// ============================================

// Listar automações
router.get('/automations', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const where: Prisma.InstagramCommentAutomationWhereInput = { companyId: req.user!.companyId };
    if (req.query.connectionId) where.connectionId = String(req.query.connectionId);

    const items = await prisma.instagramCommentAutomation.findMany({
      where,
      include: automationInclude,
      orderBy: { createdAt: 'asc' },
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// Testar casamento de um comentário com uma automação (antes de /automations/:id)
router.post('/automations/test-match', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const body = z
      .object({
        automationId: z.string().min(1),
        text: z.string(),
        mediaId: z.string().optional(),
        mediaType: z.enum(MEDIA_TYPES).optional(),
        isReply: z.boolean().optional(),
      })
      .parse(req.body);

    const automation = await prisma.instagramCommentAutomation.findFirst({
      where: { id: body.automationId, companyId: req.user!.companyId },
    });
    if (!automation) throw new NotFoundError('Automação não encontrada');

    const result = matchAutomation(automation, {
      text: body.text,
      mediaId: body.mediaId ?? (automation.mediaIds[0] || null),
      mediaProductType: body.mediaType && body.mediaType !== 'AD' && body.mediaType !== 'LIVE' ? body.mediaType : undefined,
      adId: body.mediaType === 'AD' ? 'test' : undefined,
      field: body.mediaType === 'LIVE' ? 'live_comments' : 'comments',
      parentId: body.isReply ? 'test' : undefined,
    });
    res.json({ matched: result.matched, reason: result.reason, keyword: result.keyword ?? null });
  } catch (error) {
    handleZod(error, next);
  }
});

// Detalhe da automação
router.get('/automations/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const item = await prisma.instagramCommentAutomation.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: automationInclude,
    });
    if (!item) throw new NotFoundError('Automação não encontrada');
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Criar automação
router.post('/automations', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createAutomationSchema.parse(req.body);
    const companyId = req.user!.companyId;
    validateRegexKeywords(data);
    await getInstagramConnection(companyId, data.connectionId);
    await assertDepartment(companyId, data.departmentId);

    const item = await prisma.instagramCommentAutomation.create({
      data: {
        companyId,
        connectionId: data.connectionId,
        name: data.name.trim(),
        isActive: data.isActive ?? true,
        mediaIds: cleanStrings(data.mediaIds) ?? [],
        mediaTypes: data.mediaTypes ?? [],
        keywords: cleanStrings(data.keywords) ?? [],
        matchMode: data.matchMode ?? 'contains',
        excludeReplies: data.excludeReplies ?? true,
        publicReplies: cleanStrings(data.publicReplies) ?? [],
        privateMessage: cleanPrivateMessage(data.privateMessage),
        departmentId: data.departmentId || null,
        aiEnabled: data.aiEnabled ?? true,
        oncePerUser: data.oncePerUser ?? true,
        dailyLimit: data.dailyLimit ?? null,
      },
      include: automationInclude,
    });

    logger.info(`[InstagramAutomation] Automação criada: ${item.id}`);
    res.status(201).json(item);
  } catch (error) {
    handleZod(error, next);
  }
});

// Atualizar automação (parcial)
router.put('/automations/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateAutomationSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const existing = await prisma.instagramCommentAutomation.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) throw new NotFoundError('Automação não encontrada');

    validateRegexKeywords({
      matchMode: data.matchMode ?? existing.matchMode,
      keywords: data.keywords ?? existing.keywords,
    });
    if (data.connectionId && data.connectionId !== existing.connectionId) {
      await getInstagramConnection(companyId, data.connectionId);
    }
    if (data.departmentId) await assertDepartment(companyId, data.departmentId);

    const updateData: Prisma.InstagramCommentAutomationUncheckedUpdateInput = {};
    if (data.connectionId !== undefined) updateData.connectionId = data.connectionId;
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.mediaIds !== undefined) updateData.mediaIds = cleanStrings(data.mediaIds);
    if (data.mediaTypes !== undefined) updateData.mediaTypes = data.mediaTypes;
    if (data.keywords !== undefined) updateData.keywords = cleanStrings(data.keywords);
    if (data.matchMode !== undefined) updateData.matchMode = data.matchMode;
    if (data.excludeReplies !== undefined) updateData.excludeReplies = data.excludeReplies;
    if (data.publicReplies !== undefined) updateData.publicReplies = cleanStrings(data.publicReplies);
    if (data.privateMessage !== undefined) updateData.privateMessage = cleanPrivateMessage(data.privateMessage);
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null;
    if (data.aiEnabled !== undefined) updateData.aiEnabled = data.aiEnabled;
    if (data.oncePerUser !== undefined) updateData.oncePerUser = data.oncePerUser;
    if (data.dailyLimit !== undefined) updateData.dailyLimit = data.dailyLimit;

    const item = await prisma.instagramCommentAutomation.update({
      where: { id: existing.id },
      data: updateData,
      include: automationInclude,
    });

    logger.info(`[InstagramAutomation] Automação atualizada: ${item.id}`);
    res.json(item);
  } catch (error) {
    handleZod(error, next);
  }
});

// Remover automação (eventos ficam no log com automationId = null)
router.delete('/automations/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const existing = await prisma.instagramCommentAutomation.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Automação não encontrada');

    await prisma.instagramCommentAutomation.delete({ where: { id: existing.id } });
    logger.info(`[InstagramAutomation] Automação removida: ${existing.id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Ativar/desativar automação
router.post('/automations/:id/toggle', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const existing = await prisma.instagramCommentAutomation.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Automação não encontrada');

    const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : !existing.isActive;
    const item = await prisma.instagramCommentAutomation.update({
      where: { id: existing.id },
      data: { isActive },
      include: automationInclude,
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Log de eventos de uma automação
router.get('/automations/:id/events', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const automation = await prisma.instagramCommentAutomation.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true },
    });
    if (!automation) throw new NotFoundError('Automação não encontrada');

    const where: Prisma.InstagramCommentEventWhereInput = { companyId, automationId: automation.id };
    const status = parseStatus(req.query.status);
    if (status) where.status = status;

    res.json(await listEvents(where, req.query));
  } catch (error) {
    next(error);
  }
});

// ============================================
// EVENTOS (todos os comentários recebidos)
// ============================================

router.get('/events', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const where: Prisma.InstagramCommentEventWhereInput = { companyId: req.user!.companyId };
    if (req.query.connectionId) where.connectionId = String(req.query.connectionId);
    const status = parseStatus(req.query.status);
    if (status) where.status = status;

    res.json(await listEvents(where, req.query));
  } catch (error) {
    next(error);
  }
});

// ============================================
// MÍDIAS (seletor de posts/reels)
// ============================================

router.get('/media', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connectionId = String(req.query.connectionId || '');
    if (!connectionId) throw new ValidationError('connectionId é obrigatório');
    const connection = await getInstagramConnection(req.user!.companyId, connectionId);

    const after = req.query.after ? String(req.query.after) : undefined;
    const service = new InstagramService(connection);
    const result = await service.listMedia(25, after);

    const items = (result?.data || []).map((m: any) => ({
      id: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type ?? null,
      mediaProductType: m.media_product_type ?? null,
      thumbnailUrl: m.thumbnail_url || m.media_url || null,
      permalink: m.permalink ?? null,
      timestamp: m.timestamp ?? null,
    }));

    res.json({
      items,
      paging: {
        after: result?.paging?.next ? result?.paging?.cursors?.after ?? null : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ESTATÍSTICAS
// ============================================

router.get('/stats', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const connectionId = req.query.connectionId ? String(req.query.connectionId) : undefined;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const eventWhere: Prisma.InstagramCommentEventWhereInput = {
      companyId,
      createdAt: { gte: since },
      ...(connectionId ? { connectionId } : {}),
    };

    const [byStatusRaw, automations] = await Promise.all([
      prisma.instagramCommentEvent.groupBy({
        by: ['status'],
        where: eventWhere,
        _count: { _all: true },
      }),
      prisma.instagramCommentAutomation.findMany({
        where: { companyId, ...(connectionId ? { connectionId } : {}) },
        select: {
          id: true,
          name: true,
          isActive: true,
          matchedCount: true,
          privateSentCount: true,
          userRepliedCount: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const byStatus: Record<string, number> = Object.fromEntries(EVENT_STATUSES.map((s) => [s, 0]));
    let total = 0;
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count._all;
      total += row._count._all;
    }

    res.json({
      since: since.toISOString(),
      last30Days: { total, byStatus },
      automations: automations.map((a) => ({
        id: a.id,
        name: a.name,
        isActive: a.isActive,
        events: a._count.events,
        matched: a.matchedCount,
        privateSent: a.privateSentCount,
        userReplied: a.userRepliedCount,
        replyRate: a.privateSentCount > 0 ? a.userRepliedCount / a.privateSentCount : 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export { router as instagramAutomationRouter };
