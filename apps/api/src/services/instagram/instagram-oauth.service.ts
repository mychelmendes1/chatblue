import crypto from 'crypto';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

/**
 * Business Login for Instagram (Instagram API with Instagram Login).
 * Fluxo: authorize → code → token curto → long-lived (60 dias) → refresh periódico.
 */

export const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
];

export const INSTAGRAM_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'messaging_seen',
  'message_reactions',
  'messaging_referral',
  'comments',
  'live_comments',
];

const STATE_PREFIX = 'ig:oauth:state:';
const STATE_TTL_SECONDS = 600;

export interface InstagramOAuthState {
  companyId: string;
  userId: string;
  returnTo?: string | null;
}

export interface InstagramMe {
  id: string;
  user_id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
}

export function getInstagramGraphVersion(): string {
  return process.env.INSTAGRAM_GRAPH_VERSION || 'v21.0';
}

export function getInstagramRedirectUri(): string {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${process.env.API_URL || 'http://localhost:3001'}/api/integrations/instagram/callback`
  );
}

export function isInstagramOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/** Converte a resposta de erro da Meta em Error com `meta` anexado */
export function buildMetaError(body: any, fallback: string, status?: number): Error {
  const metaErr = body?.error || {};
  const message =
    (typeof metaErr === 'object' ? metaErr.message : undefined) ||
    body?.error_message ||
    (typeof metaErr === 'string' ? metaErr : undefined) ||
    fallback;
  const err = new Error(message);
  (err as any).meta = {
    code: metaErr.code ?? body?.code,
    error_subcode: metaErr.error_subcode,
    type: metaErr.type ?? body?.error_type,
    fbtrace_id: metaErr.fbtrace_id,
  };
  if (status) (err as any).status = status;
  return err;
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function requireAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID/META_APP_SECRET não configurados');
  }
  return { appId, appSecret };
}

export class InstagramOAuthService {
  // ---------- state ----------

  static async createState(data: InstagramOAuthState): Promise<string> {
    const state = crypto.randomBytes(24).toString('hex');
    await redis.set(`${STATE_PREFIX}${state}`, JSON.stringify(data), 'EX', STATE_TTL_SECONDS);
    return state;
  }

  /** Lê e apaga o state (uso único). Retorna null se inválido/expirado. */
  static async consumeState(state: string): Promise<InstagramOAuthState | null> {
    if (!state || !/^[a-f0-9]{16,128}$/i.test(state)) return null;
    const key = `${STATE_PREFIX}${state}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    await redis.del(key);
    try {
      return JSON.parse(raw) as InstagramOAuthState;
    } catch {
      return null;
    }
  }

  // ---------- OAuth ----------

  static buildAuthorizeUrl(state: string): string {
    const { appId } = requireAppCredentials();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: getInstagramRedirectUri(),
      response_type: 'code',
      scope: INSTAGRAM_OAUTH_SCOPES.join(','),
      state,
      force_reauth: 'true',
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /** Troca o `code` por um token de curta duração */
  static async exchangeCode(code: string): Promise<{
    access_token: string;
    user_id: string;
    permissions: string[];
  }> {
    const { appId, appSecret } = requireAppCredentials();
    const cleanCode = code.replace(/#_$/, '');

    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: getInstagramRedirectUri(),
      code: cleanCode,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const body = await parseJson(response);
    if (!response.ok || !body) {
      throw buildMetaError(body, 'Falha ao trocar o código OAuth do Instagram', response.status);
    }

    // A resposta pode vir como objeto direto ou em `data[0]`
    const data = Array.isArray(body.data) ? body.data[0] : body;
    if (!data?.access_token) {
      throw buildMetaError(body, 'Resposta OAuth do Instagram sem access_token', response.status);
    }

    let permissions: string[] = [];
    if (Array.isArray(data.permissions)) permissions = data.permissions;
    else if (typeof data.permissions === 'string') permissions = data.permissions.split(',').filter(Boolean);

    return {
      access_token: data.access_token,
      user_id: String(data.user_id ?? ''),
      permissions,
    };
  }

  /** Token curto → long-lived (60 dias) */
  static async exchangeLongLived(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
    const { appSecret } = requireAppCredentials();
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortToken,
    });
    const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
    const body = await parseJson(response);
    if (!response.ok || !body?.access_token) {
      throw buildMetaError(body, 'Falha ao obter token long-lived do Instagram', response.status);
    }
    return { access_token: body.access_token, expires_in: Number(body.expires_in) || 60 * 24 * 3600 };
  }

  /** Renova um long-lived token (precisa ter ≥ 24 h e não estar expirado) */
  static async refreshLongLived(token: string): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    });
    const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
    const body = await parseJson(response);
    if (!response.ok || !body?.access_token) {
      throw buildMetaError(body, 'Falha ao renovar token do Instagram', response.status);
    }
    return { access_token: body.access_token, expires_in: Number(body.expires_in) || 60 * 24 * 3600 };
  }

  /** Dados da conta profissional. `user_id` é o ID usado no webhook/mensagens. */
  static async getMe(token: string): Promise<InstagramMe> {
    const params = new URLSearchParams({
      fields: 'id,user_id,username,name,profile_picture_url,account_type',
      access_token: token,
    });
    const response = await fetch(
      `https://graph.instagram.com/${getInstagramGraphVersion()}/me?${params.toString()}`
    );
    const body = await parseJson(response);
    if (!response.ok || !body?.id) {
      throw buildMetaError(body, 'Falha ao obter dados da conta do Instagram', response.status);
    }
    return {
      ...body,
      id: String(body.id),
      user_id: body.user_id != null ? String(body.user_id) : undefined,
    };
  }

  /** Inscreve o app nos webhooks da conta */
  static async subscribeWebhooks(
    igId: string,
    token: string,
    fields: string[] = INSTAGRAM_WEBHOOK_FIELDS
  ): Promise<string[]> {
    const params = new URLSearchParams({
      subscribed_fields: fields.join(','),
      access_token: token,
    });
    const response = await fetch(
      `https://graph.instagram.com/${getInstagramGraphVersion()}/${igId}/subscribed_apps?${params.toString()}`,
      { method: 'POST' }
    );
    const body = await parseJson(response);
    if (!response.ok || body?.success === false) {
      throw buildMetaError(body, 'Falha ao inscrever webhooks do Instagram', response.status);
    }
    logger.info(`[InstagramOAuth] Webhooks inscritos para ${igId}: ${fields.join(',')}`);
    return fields;
  }

  /** Remove a inscrição do app nos webhooks da conta */
  static async unsubscribeWebhooks(igId: string, token: string): Promise<boolean> {
    const params = new URLSearchParams({ access_token: token });
    const response = await fetch(
      `https://graph.instagram.com/${getInstagramGraphVersion()}/${igId}/subscribed_apps?${params.toString()}`,
      { method: 'DELETE' }
    );
    const body = await parseJson(response);
    if (!response.ok) {
      logger.warn('[InstagramOAuth] Falha ao remover inscrição de webhooks', { igId, error: body?.error });
      return false;
    }
    return body?.success !== false;
  }
}
