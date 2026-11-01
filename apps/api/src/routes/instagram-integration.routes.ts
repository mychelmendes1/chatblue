import { Router, Request } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import {
  InstagramOAuthService,
  INSTAGRAM_OAUTH_SCOPES,
  INSTAGRAM_WEBHOOK_FIELDS,
  getInstagramRedirectUri,
  isInstagramOAuthConfigured,
} from '../services/instagram/instagram-oauth.service.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.util.js';
import { refreshInstagramToken } from '../jobs/processors/instagram-token-refresh.processor.js';

const router = Router();

function getFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function getApiUrl(): string {
  return (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

/** Aceita apenas caminhos relativos do próprio frontend (evita open redirect) */
function sanitizeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (/[\r\n]/.test(value)) return null;
  return value.slice(0, 500);
}

function buildFrontendRedirect(returnTo: string | null | undefined, params: Record<string, string>): string {
  const url = new URL(`${getFrontendUrl()}${returnTo || '/connections'}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

/** Filtro por tenant (SUPER_ADMIN enxerga todas as empresas) */
function tenantWhere(req: Request, extra: Record<string, any> = {}): Record<string, any> {
  const where: Record<string, any> = { ...extra };
  if (req.user!.role !== 'SUPER_ADMIN' || req.query.companyId) {
    where.companyId = req.user!.companyId;
  }
  return where;
}

function shortReason(error: any): string {
  const code = error?.meta?.code;
  if (code) return `meta_${code}`;
  const msg = String(error?.message || 'unknown');
  return msg.replace(/[^a-zA-Z0-9_]+/g, '_').slice(0, 60) || 'unknown';
}

// ============================================
// Configuração (para a UI mostrar instruções)
// ============================================
router.get('/config', authenticate, ensureTenant, async (_req, res) => {
  res.json({
    configured: isInstagramOAuthConfigured(),
    redirectUri: getInstagramRedirectUri(),
    webhookUrl: `${getApiUrl()}/webhooks/instagram`,
    webhookVerifyTokenConfigured: Boolean(process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN),
    scopes: INSTAGRAM_OAUTH_SCOPES,
    webhookFields: INSTAGRAM_WEBHOOK_FIELDS,
  });
});

// ============================================
// Início do OAuth
// ============================================
router.get('/connect', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    if (!isInstagramOAuthConfigured()) {
      return res.status(400).json({
        message: 'Integração com Instagram não configurada no servidor (META_APP_ID / META_APP_SECRET).',
      });
    }
    const returnTo = sanitizeReturnTo(req.query.returnTo);
    const state = await InstagramOAuthService.createState({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      returnTo,
    });
    const authorizeUrl = InstagramOAuthService.buildAuthorizeUrl(state);
    res.json({ authorizeUrl });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Callback do OAuth (público, chamado pelo navegador vindo do Instagram)
// ============================================
router.get('/callback', async (req, res) => {
  const { code, state, error, error_reason } = req.query as Record<string, string | undefined>;

  const stateData = state ? await InstagramOAuthService.consumeState(state).catch(() => null) : null;
  const returnTo = stateData?.returnTo || null;

  if (error) {
    logger.info('[IG OAuth] Autorização negada/cancelada', { error, error_reason });
    const status = error === 'access_denied' || error_reason === 'user_denied' ? 'denied' : 'error';
    return res.redirect(
      buildFrontendRedirect(returnTo, status === 'denied' ? { instagram: 'denied' } : { instagram: 'error', reason: shortReason({ message: error }) })
    );
  }

  if (!stateData) {
    logger.warn('[IG OAuth] State inválido ou expirado no callback');
    return res.redirect(buildFrontendRedirect(null, { instagram: 'error', reason: 'invalid_state' }));
  }

  if (!code) {
    return res.redirect(buildFrontendRedirect(returnTo, { instagram: 'error', reason: 'missing_code' }));
  }

  try {
    const short = await InstagramOAuthService.exchangeCode(code);
    const longLived = await InstagramOAuthService.exchangeLongLived(short.access_token);
    const me = await InstagramOAuthService.getMe(longLived.access_token);

    // Para Instagram Login, o ID usado em webhooks/mensagens é o `user_id` da conta profissional
    const igAccountId = String(me.user_id || me.id);
    const username = me.username || igAccountId;
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + longLived.expires_in * 1000);
    const scopes = short.permissions.length > 0 ? short.permissions : INSTAGRAM_OAUTH_SCOPES;

    // Aviso se a mesma conta estiver ativa em outra empresa (o webhook roteia por entry.id)
    const otherCompany = await prisma.whatsAppConnection.findFirst({
      where: {
        type: 'INSTAGRAM',
        instagramAccountId: igAccountId,
        isActive: true,
        companyId: { not: stateData.companyId },
      },
      select: { id: true, companyId: true },
    });
    if (otherCompany) {
      logger.warn('[IG OAuth] Conta Instagram já conectada em outra empresa', {
        igAccountId,
        otherConnectionId: otherCompany.id,
        otherCompanyId: otherCompany.companyId,
      });
    }

    const existing = await prisma.whatsAppConnection.findFirst({
      where: { type: 'INSTAGRAM', companyId: stateData.companyId, instagramAccountId: igAccountId },
      orderBy: { createdAt: 'desc' },
    });

    const common = {
      accessToken: encryptSecret(longLived.access_token),
      instagramUsername: username,
      authMethod: 'oauth',
      scopes,
      tokenExpiresAt,
      // token recém-emitido: a Meta só permite refresh após 24 h
      lastTokenRefreshAt: now,
      lastError: null,
      status: 'CONNECTED' as const,
      lastConnected: now,
      isActive: true,
      webhookToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || existing?.webhookToken || null,
    };

    const connection = existing
      ? await prisma.whatsAppConnection.update({ where: { id: existing.id }, data: common })
      : await prisma.whatsAppConnection.create({
          data: {
            ...common,
            name: `@${username}`,
            type: 'INSTAGRAM',
            instagramAccountId: igAccountId,
            companyId: stateData.companyId,
          },
        });

    logger.info(`[IG OAuth] Conexão ${existing ? 'atualizada' : 'criada'}: ${connection.id} (@${username})`, {
      companyId: stateData.companyId,
      userId: stateData.userId,
    });

    const params: Record<string, string> = { instagram: 'ok', connectionId: connection.id };
    try {
      const fields = await InstagramOAuthService.subscribeWebhooks(igAccountId, longLived.access_token);
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { webhookFields: fields },
      });
    } catch (subError: any) {
      logger.error('[IG OAuth] Falha ao inscrever webhooks', {
        connectionId: connection.id,
        error: subError?.message,
        meta: subError?.meta,
      });
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { lastError: `Falha ao inscrever webhooks: ${subError?.message || subError}`.slice(0, 1000) },
      });
      params.warning = 'webhooks';
    }

    return res.redirect(buildFrontendRedirect(returnTo, params));
  } catch (err: any) {
    logger.error('[IG OAuth] Erro no callback', { error: err?.message, meta: err?.meta });
    return res.redirect(buildFrontendRedirect(returnTo, { instagram: 'error', reason: shortReason(err) }));
  }
});

// ============================================
// Status das conexões Instagram do tenant
// ============================================
router.get('/status', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      where: tenantWhere(req, { type: 'INSTAGRAM', isActive: true }),
      select: {
        id: true,
        name: true,
        instagramUsername: true,
        instagramAccountId: true,
        status: true,
        authMethod: true,
        tokenExpiresAt: true,
        webhookFields: true,
        lastTokenRefreshAt: true,
        lastError: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(connections);
  } catch (error) {
    next(error);
  }
});

async function findTenantConnection(req: Request) {
  const connection = await prisma.whatsAppConnection.findFirst({
    where: tenantWhere(req, { id: req.params.connectionId, type: 'INSTAGRAM' }),
  });
  if (!connection) throw new NotFoundError('Conexão Instagram não encontrada');
  return connection;
}

// ============================================
// Forçar renovação do token
// ============================================
router.post('/:connectionId/refresh-token', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const connection = await findTenantConnection(req);
    if (connection.authMethod !== 'oauth') {
      return res.status(400).json({ message: 'Somente conexões via OAuth podem renovar o token automaticamente.' });
    }
    const result = await refreshInstagramToken(connection.id);
    if (!result.success) {
      return res.status(400).json({ message: `Falha ao renovar token: ${result.error}` });
    }
    res.json({ success: true, tokenExpiresAt: result.tokenExpiresAt });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Reinscrever webhooks
// ============================================
router.post('/:connectionId/resubscribe', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const connection = await findTenantConnection(req);
    const token = decryptSecret(connection.accessToken);
    if (!token || !connection.instagramAccountId) {
      return res.status(400).json({ message: 'Conexão sem token ou sem ID da conta Instagram.' });
    }
    try {
      const fields = await InstagramOAuthService.subscribeWebhooks(connection.instagramAccountId, token);
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { webhookFields: fields, lastError: null },
      });
      res.json({ success: true, webhookFields: fields });
    } catch (subError: any) {
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { lastError: `Falha ao inscrever webhooks: ${subError?.message || subError}`.slice(0, 1000) },
      });
      res.status(400).json({ message: `Falha ao inscrever webhooks: ${subError?.message || subError}`, meta: subError?.meta });
    }
  } catch (error) {
    next(error);
  }
});

export { router as instagramIntegrationRouter };
