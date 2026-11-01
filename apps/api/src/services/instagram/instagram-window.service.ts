import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

/**
 * Janela de mensagens do Instagram Direct (ver docs/INSTAGRAM_CHANNEL_PLAN.md §2.3 e §4.3).
 *
 * - standard: 24h a partir da última mensagem do usuário (`Contact.lastMessageAt`).
 * - ctd_ad: conversa iniciada por anúncio Click-to-Direct → 7 dias.
 * - private_reply_pending: enviamos um private reply a partir de um comentário; a janela só abre
 *   quando a pessoa responder no Direct.
 * - HUMAN_AGENT: atendente humano pode responder até 7 dias após a última mensagem do usuário,
 *   somente se a permissão Human Agent estiver aprovada (env INSTAGRAM_HUMAN_AGENT_ENABLED=true).
 *   IA e automações NUNCA usam a tag.
 */

export type InstagramWindowSource = 'standard' | 'ctd_ad' | 'private_reply_pending' | null;

export interface InstagramWindowState {
  /** Janela padrão (24h, ou 7d para ctd_ad) aberta */
  isOpen: boolean;
  /** Quando a janela padrão expira/expirou (null se nunca houve mensagem do usuário) */
  expiresAt: Date | null;
  /** Minutos restantes da janela padrão (0 se fechada, null se nunca houve mensagem do usuário) */
  minutesRemaining: number | null;
  source: InstagramWindowSource;
  /** INSTAGRAM_HUMAN_AGENT_ENABLED === 'true' e última mensagem do usuário há menos de 7 dias */
  humanAgentAvailable: boolean;
  humanAgentExpiresAt: Date | null;
  lastInboundAt: Date | null;
  /** Mensagem em português para a UI quando a janela está fechada */
  reason?: string;
}

export type OutboundActor = 'human' | 'ai' | 'automation';

const HOUR_MS = 60 * 60 * 1000;
const STANDARD_WINDOW_MS = 24 * HOUR_MS;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

export const INSTAGRAM_WINDOW_REASONS = {
  privateReplyPending:
    'Enviamos a mensagem a partir do comentário. Só é possível continuar quando a pessoa responder no Direct.',
  closed: 'Janela de 24h do Instagram fechada. O cliente precisa enviar uma mensagem para reabrir.',
  humanAgentHint: ' Você pode responder como agente humano (até 7 dias).',
} as const;

export class InstagramWindowClosedError extends Error {
  readonly code = 'INSTAGRAM_WINDOW_CLOSED';
  readonly state: InstagramWindowState;
  readonly actor: OutboundActor;

  constructor(state: InstagramWindowState, actor: OutboundActor) {
    super(state.reason || INSTAGRAM_WINDOW_REASONS.closed);
    this.name = 'InstagramWindowClosedError';
    this.state = state;
    this.actor = actor;
  }
}

function isHumanAgentEnabled(): boolean {
  return process.env.INSTAGRAM_HUMAN_AGENT_ENABLED === 'true';
}

function normalizeSource(value: string | null | undefined): InstagramWindowSource {
  if (value === 'standard' || value === 'ctd_ad' || value === 'private_reply_pending') {
    return value;
  }
  return null;
}

export class InstagramWindowService {
  /**
   * Calcula o estado da janela a partir do contato (função pura, sem I/O).
   */
  static getState(
    contact: { lastMessageAt: Date | null; windowSource?: string | null },
    now: Date = new Date()
  ): InstagramWindowState {
    const lastInboundAt = contact.lastMessageAt ? new Date(contact.lastMessageAt) : null;
    const storedSource = normalizeSource(contact.windowSource);
    const source: InstagramWindowSource = storedSource ?? (lastInboundAt ? 'standard' : null);

    // Nunca recebemos mensagem no Direct: nada pode ser enviado
    if (!lastInboundAt) {
      return {
        isOpen: false,
        expiresAt: null,
        minutesRemaining: null,
        source,
        humanAgentAvailable: false,
        humanAgentExpiresAt: null,
        lastInboundAt: null,
        reason:
          source === 'private_reply_pending'
            ? INSTAGRAM_WINDOW_REASONS.privateReplyPending
            : INSTAGRAM_WINDOW_REASONS.closed,
      };
    }

    const durationMs = source === 'ctd_ad' ? SEVEN_DAYS_MS : STANDARD_WINDOW_MS;
    const expiresAt = new Date(lastInboundAt.getTime() + durationMs);
    const isOpen = expiresAt.getTime() > now.getTime();
    const minutesRemaining = isOpen
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000))
      : 0;

    const humanAgentEnabled = isHumanAgentEnabled();
    const humanAgentExpiresAt = humanAgentEnabled
      ? new Date(lastInboundAt.getTime() + SEVEN_DAYS_MS)
      : null;
    const humanAgentAvailable =
      !!humanAgentExpiresAt && humanAgentExpiresAt.getTime() > now.getTime();

    const state: InstagramWindowState = {
      isOpen,
      expiresAt,
      minutesRemaining,
      source,
      humanAgentAvailable,
      humanAgentExpiresAt,
      lastInboundAt,
    };

    if (!isOpen) {
      state.reason =
        INSTAGRAM_WINDOW_REASONS.closed +
        (humanAgentAvailable ? INSTAGRAM_WINDOW_REASONS.humanAgentHint : '');
    }

    return state;
  }

  /**
   * Estado da janela para um ticket. Retorna null se o ticket não for do Instagram.
   */
  static async getStateForTicket(
    ticketId: string,
    companyId: string
  ): Promise<InstagramWindowState | null> {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, companyId },
      select: {
        connection: { select: { type: true } },
        contact: { select: { lastMessageAt: true, windowSource: true } },
      },
    });

    if (!ticket || ticket.connection?.type !== 'INSTAGRAM' || !ticket.contact) {
      return null;
    }

    return this.getState(ticket.contact);
  }

  /**
   * Decide como uma mensagem de saída pode ser enviada.
   * - Janela padrão aberta → envio normal.
   * - Fechada, actor 'human' e Human Agent disponível (7d) → tag HUMAN_AGENT.
   * - IA/automação nunca usam a tag.
   * Lança InstagramWindowClosedError quando o envio não é permitido.
   */
  static resolveSendOptions(
    state: InstagramWindowState,
    actor: OutboundActor
  ): { tag?: 'HUMAN_AGENT' } {
    if (state.isOpen) {
      return {};
    }

    if (actor === 'human' && state.humanAgentAvailable) {
      return { tag: 'HUMAN_AGENT' };
    }

    throw new InstagramWindowClosedError(state, actor);
  }

  /**
   * Registra uma mensagem recebida do usuário no Direct (abre/renova a janela).
   * - fromAd → windowSource = 'ctd_ad' (7 dias a partir desta mensagem).
   * - Nunca rebaixa 'ctd_ad' para 'standard' enquanto a janela de 7 dias do anúncio ainda
   *   cobrir pelo menos as próximas 24h; nesse caso `lastMessageAt` continua sendo o início
   *   da janela do anúncio (para não estender os 7 dias indefinidamente).
   * - 'private_reply_pending' vira 'standard' quando a pessoa responde.
   */
  static async registerInbound(
    contactId: string,
    timestamp: Date,
    opts?: { fromAd?: boolean }
  ): Promise<void> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { lastMessageAt: true, windowSource: true },
      });

      if (!contact) {
        logger.warn(`[InstagramWindow] registerInbound: contato ${contactId} não encontrado`);
        return;
      }

      const ts = timestamp.getTime();

      if (opts?.fromAd) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { lastMessageAt: timestamp, windowSource: 'ctd_ad' },
        });
        logger.info(`[InstagramWindow] Janela de anúncio (7d) aberta para contato ${contactId}`);
        return;
      }

      const last = contact.lastMessageAt?.getTime() ?? null;

      if (contact.windowSource === 'ctd_ad' && last !== null) {
        const adWindowEnd = last + SEVEN_DAYS_MS;
        if (adWindowEnd >= ts + STANDARD_WINDOW_MS) {
          // Janela do anúncio ainda cobre mais que a janela padrão desta mensagem: mantém ctd_ad
          return;
        }
      }

      // Não volta no tempo (webhooks podem chegar fora de ordem)
      const newLast =
        last !== null && last > ts && contact.windowSource !== 'private_reply_pending'
          ? contact.lastMessageAt!
          : timestamp;

      await prisma.contact.update({
        where: { id: contactId },
        data: { lastMessageAt: newLast, windowSource: 'standard' },
      });
    } catch (error: any) {
      logger.error(`[InstagramWindow] Falha ao registrar mensagem recebida (contato ${contactId}):`, {
        message: error?.message,
      });
    }
  }
}
