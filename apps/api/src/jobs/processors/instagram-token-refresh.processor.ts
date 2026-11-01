import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { encryptSecret, decryptSecret } from '../../utils/crypto.util.js';
import { InstagramOAuthService } from '../../services/instagram/instagram-oauth.service.js';

const REFRESH_WINDOW_MS = 15 * 24 * 3600 * 1000; // renova quando faltar < 15 dias
const MIN_REFRESH_INTERVAL_MS = 24 * 3600 * 1000; // a Meta só renova tokens com ≥ 24 h

/**
 * Renova o long-lived token de uma conexão Instagram (OAuth).
 * Em caso de falha marca a conexão como ERROR e grava `lastError`.
 */
export async function refreshInstagramToken(
  connectionId: string
): Promise<{ success: boolean; tokenExpiresAt?: Date; error?: string }> {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.type !== 'INSTAGRAM') {
    return { success: false, error: 'Conexão Instagram não encontrada' };
  }

  try {
    const currentToken = decryptSecret(connection.accessToken);
    if (!currentToken) {
      throw new Error('Conexão sem access token');
    }

    const { access_token, expires_in } = await InstagramOAuthService.refreshLongLived(currentToken);
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptSecret(access_token),
        tokenExpiresAt,
        lastTokenRefreshAt: new Date(),
        lastError: null,
        ...(connection.status === 'ERROR' && { status: 'CONNECTED' }),
      },
    });

    logger.info(`[IG Token] Token renovado para ${connection.id}, expira em ${tokenExpiresAt.toISOString()}`);
    return { success: true, tokenExpiresAt };
  } catch (error: any) {
    const message = error?.message || String(error);
    logger.error(`[IG Token] Falha ao renovar token da conexão ${connection.id}`, {
      error: message,
      meta: error?.meta,
    });
    await prisma.whatsAppConnection
      .update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          lastError: `Falha ao renovar token do Instagram: ${message}`.slice(0, 1000),
        },
      })
      .catch(() => undefined);
    return { success: false, error: message };
  }
}

/**
 * Job recorrente (fila `instagram-token-refresh`): renova tokens perto de expirar.
 */
export async function instagramTokenRefreshProcessor(job: Job): Promise<void> {
  const now = Date.now();
  const connections = await prisma.whatsAppConnection.findMany({
    where: {
      type: 'INSTAGRAM',
      authMethod: 'oauth',
      isActive: true,
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: new Date(now + REFRESH_WINDOW_MS) } }],
    },
    select: { id: true, lastTokenRefreshAt: true, tokenExpiresAt: true },
  });

  let refreshed = 0;
  let failed = 0;
  for (const conn of connections) {
    if (conn.lastTokenRefreshAt && now - conn.lastTokenRefreshAt.getTime() < MIN_REFRESH_INTERVAL_MS) {
      continue;
    }
    const result = await refreshInstagramToken(conn.id);
    if (result.success) refreshed++;
    else failed++;
  }

  logger.info(`[IG Token] Job ${job.id}: ${refreshed} renovado(s), ${failed} falha(s), ${connections.length} candidata(s)`);
}
