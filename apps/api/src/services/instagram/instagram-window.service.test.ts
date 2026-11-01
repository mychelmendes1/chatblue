import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
  prisma: {
    contact: { findUnique: vi.fn(), update: vi.fn() },
    ticket: { findFirst: vi.fn() },
  },
}));

vi.mock('../../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../../config/database.js';
import {
  InstagramWindowService,
  InstagramWindowClosedError,
  INSTAGRAM_WINDOW_REASONS,
} from './instagram-window.service.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-11-01T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe('InstagramWindowService', () => {
  const originalEnv = process.env.INSTAGRAM_HUMAN_AGENT_ENABLED;

  beforeEach(() => {
    delete process.env.INSTAGRAM_HUMAN_AGENT_ENABLED;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.INSTAGRAM_HUMAN_AGENT_ENABLED;
    else process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = originalEnv;
  });

  describe('getState', () => {
    it('janela padrão aberta (mensagem há 2h)', () => {
      const state = InstagramWindowService.getState(
        { lastMessageAt: ago(2 * HOUR), windowSource: 'standard' },
        NOW
      );
      expect(state.isOpen).toBe(true);
      expect(state.source).toBe('standard');
      expect(state.expiresAt?.toISOString()).toBe(new Date(ago(2 * HOUR).getTime() + DAY).toISOString());
      expect(state.minutesRemaining).toBe(22 * 60);
      expect(state.reason).toBeUndefined();
      expect(state.lastInboundAt?.toISOString()).toBe(ago(2 * HOUR).toISOString());
    });

    it('assume standard quando windowSource é nulo mas há lastMessageAt', () => {
      const state = InstagramWindowService.getState({ lastMessageAt: ago(HOUR) }, NOW);
      expect(state.isOpen).toBe(true);
      expect(state.source).toBe('standard');
    });

    it('janela padrão expirada sem Human Agent', () => {
      const state = InstagramWindowService.getState(
        { lastMessageAt: ago(25 * HOUR), windowSource: 'standard' },
        NOW
      );
      expect(state.isOpen).toBe(false);
      expect(state.minutesRemaining).toBe(0);
      expect(state.humanAgentAvailable).toBe(false);
      expect(state.humanAgentExpiresAt).toBeNull();
      expect(state.reason).toBe(INSTAGRAM_WINDOW_REASONS.closed);
    });

    it('janela padrão expirada com Human Agent habilitado (< 7 dias)', () => {
      process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = 'true';
      const state = InstagramWindowService.getState(
        { lastMessageAt: ago(3 * DAY), windowSource: 'standard' },
        NOW
      );
      expect(state.isOpen).toBe(false);
      expect(state.humanAgentAvailable).toBe(true);
      expect(state.humanAgentExpiresAt?.toISOString()).toBe(new Date(ago(3 * DAY).getTime() + 7 * DAY).toISOString());
      expect(state.reason).toBe(
        'Janela de 24h do Instagram fechada. O cliente precisa enviar uma mensagem para reabrir. Você pode responder como agente humano (até 7 dias).'
      );
    });

    it('Human Agent habilitado mas última mensagem há mais de 7 dias', () => {
      process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = 'true';
      const state = InstagramWindowService.getState(
        { lastMessageAt: ago(8 * DAY), windowSource: 'standard' },
        NOW
      );
      expect(state.isOpen).toBe(false);
      expect(state.humanAgentAvailable).toBe(false);
      expect(state.reason).toBe(INSTAGRAM_WINDOW_REASONS.closed);
    });

    it('ctd_ad: janela de 7 dias', () => {
      const open = InstagramWindowService.getState(
        { lastMessageAt: ago(5 * DAY), windowSource: 'ctd_ad' },
        NOW
      );
      expect(open.isOpen).toBe(true);
      expect(open.source).toBe('ctd_ad');
      expect(open.minutesRemaining).toBe(2 * 24 * 60);

      const closed = InstagramWindowService.getState(
        { lastMessageAt: ago(7 * DAY + HOUR), windowSource: 'ctd_ad' },
        NOW
      );
      expect(closed.isOpen).toBe(false);
      expect(closed.reason).toBe(INSTAGRAM_WINDOW_REASONS.closed);
    });

    it('private_reply_pending sem mensagem do usuário: fechada com motivo específico', () => {
      process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = 'true';
      const state = InstagramWindowService.getState(
        { lastMessageAt: null, windowSource: 'private_reply_pending' },
        NOW
      );
      expect(state.isOpen).toBe(false);
      expect(state.source).toBe('private_reply_pending');
      expect(state.expiresAt).toBeNull();
      expect(state.minutesRemaining).toBeNull();
      expect(state.humanAgentAvailable).toBe(false);
      expect(state.reason).toBe(
        'Enviamos a mensagem a partir do comentário. Só é possível continuar quando a pessoa responder no Direct.'
      );
    });

    it('sem nenhuma mensagem recebida: fechada', () => {
      const state = InstagramWindowService.getState({ lastMessageAt: null }, NOW);
      expect(state.isOpen).toBe(false);
      expect(state.source).toBeNull();
      expect(state.reason).toBe(INSTAGRAM_WINDOW_REASONS.closed);
    });
  });

  describe('resolveSendOptions', () => {
    it('janela aberta: envio sem tag para qualquer ator', () => {
      const state = InstagramWindowService.getState({ lastMessageAt: ago(HOUR) }, NOW);
      expect(InstagramWindowService.resolveSendOptions(state, 'human')).toEqual({});
      expect(InstagramWindowService.resolveSendOptions(state, 'ai')).toEqual({});
      expect(InstagramWindowService.resolveSendOptions(state, 'automation')).toEqual({});
    });

    it('expirada sem Human Agent: lança para humano e IA', () => {
      const state = InstagramWindowService.getState({ lastMessageAt: ago(30 * HOUR) }, NOW);
      expect(() => InstagramWindowService.resolveSendOptions(state, 'human')).toThrow(InstagramWindowClosedError);
      expect(() => InstagramWindowService.resolveSendOptions(state, 'ai')).toThrow(InstagramWindowClosedError);
    });

    it('expirada com Human Agent: humano usa tag, IA/automação lançam', () => {
      process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = 'true';
      const state = InstagramWindowService.getState({ lastMessageAt: ago(2 * DAY) }, NOW);
      expect(InstagramWindowService.resolveSendOptions(state, 'human')).toEqual({ tag: 'HUMAN_AGENT' });

      let caught: unknown;
      try {
        InstagramWindowService.resolveSendOptions(state, 'ai');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InstagramWindowClosedError);
      expect((caught as InstagramWindowClosedError).state).toBe(state);
      expect((caught as InstagramWindowClosedError).message).toBe(state.reason);

      expect(() => InstagramWindowService.resolveSendOptions(state, 'automation')).toThrow(InstagramWindowClosedError);
    });

    it('ctd_ad dentro de 7 dias: IA pode enviar sem tag', () => {
      const state = InstagramWindowService.getState({ lastMessageAt: ago(4 * DAY), windowSource: 'ctd_ad' }, NOW);
      expect(InstagramWindowService.resolveSendOptions(state, 'ai')).toEqual({});
    });

    it('private_reply_pending: ninguém envia, nem humano com Human Agent', () => {
      process.env.INSTAGRAM_HUMAN_AGENT_ENABLED = 'true';
      const state = InstagramWindowService.getState(
        { lastMessageAt: null, windowSource: 'private_reply_pending' },
        NOW
      );
      expect(() => InstagramWindowService.resolveSendOptions(state, 'human')).toThrow(InstagramWindowClosedError);
      expect(() => InstagramWindowService.resolveSendOptions(state, 'ai')).toThrow(InstagramWindowClosedError);
    });
  });

  describe('registerInbound', () => {
    const findUnique = prisma.contact.findUnique as unknown as ReturnType<typeof vi.fn>;
    const update = prisma.contact.update as unknown as ReturnType<typeof vi.fn>;

    it('mensagem de anúncio marca ctd_ad', async () => {
      findUnique.mockResolvedValue({ lastMessageAt: null, windowSource: null });
      await InstagramWindowService.registerInbound('c1', NOW, { fromAd: true });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { lastMessageAt: NOW, windowSource: 'ctd_ad' },
      });
    });

    it('não rebaixa ctd_ad enquanto a janela de 7d cobre mais que 24h', async () => {
      findUnique.mockResolvedValue({ lastMessageAt: ago(2 * DAY), windowSource: 'ctd_ad' });
      await InstagramWindowService.registerInbound('c1', NOW);
      expect(update).not.toHaveBeenCalled();
    });

    it('ctd_ad perto do fim vira standard a partir da nova mensagem', async () => {
      findUnique.mockResolvedValue({ lastMessageAt: ago(6.5 * DAY), windowSource: 'ctd_ad' });
      await InstagramWindowService.registerInbound('c1', NOW);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { lastMessageAt: NOW, windowSource: 'standard' },
      });
    });

    it('private_reply_pending vira standard quando a pessoa responde', async () => {
      findUnique.mockResolvedValue({ lastMessageAt: null, windowSource: 'private_reply_pending' });
      await InstagramWindowService.registerInbound('c1', NOW);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { lastMessageAt: NOW, windowSource: 'standard' },
      });
    });
  });
});
