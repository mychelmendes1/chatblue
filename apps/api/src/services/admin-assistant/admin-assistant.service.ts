import { prisma } from '../../config/database.js';
import { startOfDay, endOfDay } from 'date-fns';
import { AIService } from '../ai/ai.service.js';
import { logger } from '../../config/logger.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TodayContext {
  date: string;
  tickets: {
    totalCreated: number;
    pending: number;
    inProgress: number;
    resolved: number;
    slaBreached: number;
    avgResponseTimeMinutes: number;
  };
  agents: Array<{
    id: string;
    name: string;
    ticketsAssignedToday: number;
    ticketsResolvedToday: number;
    followUpsToday: number;
    messagesSentToday: number;
    messagesReceivedToday: number;
    isOnline: boolean;
    lastSeen: string | null;
  }>;
}

const SYSTEM_PROMPT = `Você é um assistente de monitoramento para administradores. Responda em português, de forma clara e objetiva, com base APENAS nos dados do dia atual fornecidos abaixo. Se a pergunta não puder ser respondida com esses dados, diga isso. Não invente números. Os dados são do dia atual (hoje).

Por atendente, além de tickets e follow-ups, existem:
- messagesSentToday: mensagens enviadas pelo atendente hoje.
- messagesReceivedToday: mensagens do cliente nos tickets do atendente hoje.
- "Mensagens trocadas" = messagesSentToday + messagesReceivedToday. Use essa soma para perguntas como "quantas mensagens ele trocou?", "quantas conversas/mensagens?".

Use esses campos para perguntas como "quantas mensagens [nome] enviou?", "quantas mensagens ele trocou?", "quantas conversas/mensagens?".

DADOS DO DIA (formato JSON para referência):
{{CONTEXT_JSON}}

Responda de forma natural e direta às perguntas do administrador sobre: atendimentos novos hoje, desempenho por atendente, mensagens enviadas e trocadas, follow-ups (retomadas em tickets aguardando + reaberturas), quem está online, prazos de atendimento (SLA), etc.`;

export class AdminAssistantService {
  private companyId: string;
  private aiService: AIService | null = null;

  constructor(openAiApiKey: string, companyId: string) {
    this.companyId = companyId;
    if (openAiApiKey) {
      this.aiService = new AIService('openai', openAiApiKey);
    }
  }

  async getTodayContext(): Promise<TodayContext> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      totalCreated,
      pendingToday,
      inProgressToday,
      resolvedToday,
      slaBreachedToday,
      avgResponseAgg,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { companyId: this.companyId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { companyId: this.companyId, status: 'PENDING', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { companyId: this.companyId, status: 'IN_PROGRESS', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { companyId: this.companyId, status: 'RESOLVED', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { companyId: this.companyId, slaBreached: true, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.aggregate({
        where: {
          companyId: this.companyId,
          responseTime: { not: null },
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _avg: { responseTime: true },
      }),
    ]);

    const agents = await prisma.user.findMany({
      where: {
        companyId: this.companyId,
        isActive: true,
        isAI: false,
        role: { in: ['AGENT', 'SUPERVISOR'] },
      },
      select: {
        id: true,
        name: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    const agentIds = agents.map((a) => a.id);

    const ticketsByAgentToday = await prisma.ticket.groupBy({
      by: ['assignedToId'],
      where: {
        companyId: this.companyId,
        assignedToId: { in: agentIds },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _count: { id: true },
    });

    const resolvedByAgentToday = await prisma.ticket.groupBy({
      by: ['assignedToId'],
      where: {
        companyId: this.companyId,
        assignedToId: { in: agentIds },
        status: 'RESOLVED',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _count: { id: true },
    });

    const reopenActivitiesToday = await prisma.activity.groupBy({
      by: ['userId'],
      where: {
        type: 'TICKET_REOPENED',
        userId: { in: agentIds },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _count: { id: true },
    });

    const waitingTicketIds = await prisma.ticket.findMany({
      where: { companyId: this.companyId, status: 'WAITING' },
      select: { id: true },
    });
    const waitingIds = waitingTicketIds.map((t) => t.id);

    const retomadasByAgent =
      waitingIds.length > 0
        ? await prisma.message.groupBy({
            by: ['senderId'],
            where: {
              isFromMe: true,
              senderId: { in: agentIds },
              ticketId: { in: waitingIds },
              createdAt: { gte: todayStart, lte: todayEnd },
            },
            _count: { id: true },
          })
        : [];

    const messagesSentByAgentToday = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        isFromMe: true,
        senderId: { in: agentIds },
        createdAt: { gte: todayStart, lte: todayEnd },
        ticket: { companyId: this.companyId },
      },
      _count: { id: true },
    });

    const messagesReceivedByAgentToday = await Promise.all(
      agentIds.map((agentId) =>
        prisma.message.count({
          where: {
            isFromMe: false,
            createdAt: { gte: todayStart, lte: todayEnd },
            ticket: { companyId: this.companyId, assignedToId: agentId },
          },
        })
      )
    );
    const messagesReceivedMap = new Map<string, number>();
    agentIds.forEach((id, i) => messagesReceivedMap.set(id, messagesReceivedByAgentToday[i] ?? 0));

    const messagesSentMap = new Map<string, number>();
    messagesSentByAgentToday.forEach((g) => {
      if (g.senderId) messagesSentMap.set(g.senderId, g._count.id);
    });

    const ticketsAssignedMap = new Map<string, number>();
    ticketsByAgentToday.forEach((g) => {
      if (g.assignedToId) ticketsAssignedMap.set(g.assignedToId, g._count.id);
    });
    const resolvedMap = new Map<string, number>();
    resolvedByAgentToday.forEach((g) => {
      if (g.assignedToId) resolvedMap.set(g.assignedToId, g._count.id);
    });
    const reopenMap = new Map<string, number>();
    reopenActivitiesToday.forEach((g) => {
      if (g.userId) reopenMap.set(g.userId, g._count.id);
    });
    const retomadasMap = new Map<string, number>();
    retomadasByAgent.forEach((g) => {
      if (g.senderId) retomadasMap.set(g.senderId, g._count.id);
    });

    const agentsWithMetrics = agents.map((a) => {
      const assigned = ticketsAssignedMap.get(a.id) ?? 0;
      const resolved = resolvedMap.get(a.id) ?? 0;
      const reopen = reopenMap.get(a.id) ?? 0;
      const retomadas = retomadasMap.get(a.id) ?? 0;
      const messagesSent = messagesSentMap.get(a.id) ?? 0;
      const messagesReceived = messagesReceivedMap.get(a.id) ?? 0;
      return {
        id: a.id,
        name: a.name,
        ticketsAssignedToday: assigned,
        ticketsResolvedToday: resolved,
        followUpsToday: reopen + retomadas,
        messagesSentToday: messagesSent,
        messagesReceivedToday: messagesReceived,
        isOnline: a.isOnline,
        lastSeen: a.lastSeen ? a.lastSeen.toISOString() : null,
      };
    });

    const avgResponseTimeMinutes = avgResponseAgg._avg.responseTime
      ? Math.round(avgResponseAgg._avg.responseTime / 60)
      : 0;

    return {
      date: now.toISOString().slice(0, 10),
      tickets: {
        totalCreated,
        pending: pendingToday,
        inProgress: inProgressToday,
        resolved: resolvedToday,
        slaBreached: slaBreachedToday,
        avgResponseTimeMinutes,
      },
      agents: agentsWithMetrics,
    };
  }

  async chat(message: string, history: ChatMessage[]): Promise<string> {
    if (!this.aiService) {
      throw new Error('OpenAI API key (Whisper key) is not configured. Please configure it in company settings.');
    }

    const context = await this.getTodayContext();
    const contextJson = JSON.stringify(context, null, 2);
    const systemPrompt = SYSTEM_PROMPT.replace('{{CONTEXT_JSON}}', contextJson);

    const historyForContext = history.map((m) => ({ role: m.role, content: m.content }));

    const response = await this.aiService.generateResponse(
      systemPrompt,
      message,
      { history: historyForContext },
      {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 800,
      }
    );

    return response || 'Não consegui gerar uma resposta. Tente reformular a pergunta.';
  }
}
