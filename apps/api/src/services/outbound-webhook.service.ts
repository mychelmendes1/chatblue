import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

const FETCH_TIMEOUT_MS = 10000;

export type OutboundEvent =
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_resolved'
  | 'message_created';

export interface OutboundPayload {
  event: OutboundEvent;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Send an outbound webhook event to the configured URL (e.g. Supabase function).
 * Fire-and-forget: does not block the request. If URL is not set, no-op.
 */
export async function sendOutboundEvent(
  companyId: string,
  event: OutboundEvent,
  payload: Record<string, unknown>
): Promise<void> {
  setImmediate(async () => {
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
        select: { outboundWebhookUrl: true, outboundWebhookSecret: true },
      });

      const url = settings?.outboundWebhookUrl?.trim();
      if (!url) return;

      const body: OutboundPayload = {
        event,
        payload,
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ChatBlue-Outbound-Webhook/1.0',
      };
      if (settings?.outboundWebhookSecret) {
        headers['X-Webhook-Secret'] = settings.outboundWebhookSecret;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[OutboundWebhook] ${event} -> ${url} returned ${response.status}`);
      }
    } catch (error: unknown) {
      logger.error(`[OutboundWebhook] ${event} failed:`, (error as Error)?.message);
    }
  });
}
