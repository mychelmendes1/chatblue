import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { addMLTrainingCollectorJob } from '../../jobs/index.js';

/**
 * Service de integração do sistema de ML com o fluxo de atendimento
 * Fornece hooks para eventos importantes que alimentam o aprendizado
 */
export class MLIntegrationService {
  /**
   * Chamado quando um ticket é resolvido
   * Agenda coleta de training pairs do ticket
   */
  static async onTicketResolved(ticketId: string, companyId: string): Promise<void> {
    try {
      // Verificar se ML está habilitado para a empresa
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
        select: { aiEnabled: true },
      });

      if (!settings?.aiEnabled) {
        return;
      }

      // Agendar coleta do ticket específico (com delay para garantir que todas as mensagens foram salvas)
      await addMLTrainingCollectorJob({
        type: 'collect-single-ticket',
        companyId,
        ticketId,
      });

      logger.debug('ML training collection scheduled for resolved ticket', {
        ticketId,
        companyId,
      });
    } catch (error) {
      logger.warn('Failed to schedule ML collection for resolved ticket', {
        ticketId,
        error,
      });
    }
  }

  /**
   * Chamado quando há transferência AI -> Humano
   * Registra para aprendizado futuro
   */
  static async onAIToHumanTransfer(
    ticketId: string,
    companyId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Verificar se ML está habilitado
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
        select: { aiEnabled: true },
      });

      if (!settings?.aiEnabled) {
        return;
      }

      // Criar registro de decisão para auditoria
      await prisma.mLAIDecisionLog.create({
        data: {
          companyId,
          ticketId,
          messageId: '', // Será preenchido se disponível
          customerMessage: '',
          messageEmbedding: [],
          decision: 'TRANSFER_TO_HUMAN',
          decisionReason: reason,
          processingTimeMs: 0,
        },
      });

      logger.debug('AI to human transfer logged for ML', {
        ticketId,
        reason,
      });
    } catch (error) {
      logger.warn('Failed to log AI to human transfer', {
        ticketId,
        error,
      });
    }
  }

  /**
   * Chamado quando o atendente usa uma sugestão da IA
   * Registra o uso para melhorar templates
   */
  static async onAISuggestionUsed(
    companyId: string,
    ticketId: string,
    suggestionId: string,
    wasEdited: boolean
  ): Promise<void> {
    try {
      // Atualizar registro de query
      await prisma.aIAssistantQuery.update({
        where: { id: suggestionId },
        data: {
          wasUsed: true,
          wasEdited,
          usedAt: new Date(),
        },
      });

      // Se não foi editada, aumentar contador de sucesso do template usado (se houver)
      if (!wasEdited) {
        const query = await prisma.aIAssistantQuery.findUnique({
          where: { id: suggestionId },
          select: { detectedCategory: true },
        });

        if (query?.detectedCategory) {
          // Atualizar estatísticas de templates da categoria
          await prisma.mLResponseTemplate.updateMany({
            where: {
              companyId,
              category: query.detectedCategory,
              isActive: true,
            },
            data: {
              successCount: { increment: 1 },
            },
          });
        }
      }

      logger.debug('AI suggestion usage recorded', {
        suggestionId,
        wasEdited,
      });
    } catch (error) {
      logger.warn('Failed to record AI suggestion usage', {
        suggestionId,
        error,
      });
    }
  }

  /**
   * Chamado quando o cliente avalia o atendimento
   * Atualiza métricas de qualidade dos templates usados
   */
  static async onTicketRated(
    ticketId: string,
    companyId: string,
    rating: number,
    npsScore?: number
  ): Promise<void> {
    try {
      // Buscar queries da IA usadas neste ticket
      const queries = await prisma.aIAssistantQuery.findMany({
        where: {
          ticketId,
          wasUsed: true,
        },
        select: {
          id: true,
          detectedCategory: true,
        },
      });

      if (queries.length === 0) {
        return;
      }

      // Atualizar training pairs do ticket com o rating
      await prisma.mLTrainingPair.updateMany({
        where: {
          ticketId,
          companyId,
        },
        data: {
          customerRating: rating,
          npsScore: npsScore,
          ticketResolved: true,
        },
      });

      // Se rating >= 4, considerar templates como bem-sucedidos
      if (rating >= 4) {
        for (const query of queries) {
          if (query.detectedCategory) {
            await prisma.mLResponseTemplate.updateMany({
              where: {
                companyId,
                category: query.detectedCategory,
                isActive: true,
              },
              data: {
                successCount: { increment: 1 },
              },
            });
          }
        }
      }

      logger.debug('Ticket rating recorded for ML', {
        ticketId,
        rating,
        queriesUpdated: queries.length,
      });
    } catch (error) {
      logger.warn('Failed to record ticket rating for ML', {
        ticketId,
        error,
      });
    }
  }

  /**
   * Chamado quando a IA gera uma resposta
   * Registra a decisão para auditoria e aprendizado
   */
  static async logAIDecision(data: {
    companyId: string;
    ticketId: string;
    messageId: string;
    customerMessage: string;
    messageEmbedding?: number[];
    detectedIntent?: string;
    intentConfidence?: number;
    detectedCategory?: string;
    categoryConfidence?: number;
    decision: 'RESPOND_AI' | 'TRANSFER_TO_HUMAN' | 'SUGGEST_ONLY';
    decisionReason?: string;
    generatedResponse?: string;
    templateUsedId?: string;
    documentsUsedIds?: string[];
    qualityScore?: number;
    processingTimeMs: number;
  }): Promise<string | null> {
    try {
      const log = await prisma.mLAIDecisionLog.create({
        data: {
          companyId: data.companyId,
          ticketId: data.ticketId,
          messageId: data.messageId,
          customerMessage: data.customerMessage,
          messageEmbedding: data.messageEmbedding || [],
          detectedIntent: data.detectedIntent,
          intentConfidence: data.intentConfidence,
          detectedCategory: data.detectedCategory,
          categoryConfidence: data.categoryConfidence,
          decision: data.decision,
          decisionReason: data.decisionReason,
          generatedResponse: data.generatedResponse,
          templateUsedId: data.templateUsedId,
          documentsUsedIds: data.documentsUsedIds || [],
          qualityScore: data.qualityScore,
          processingTimeMs: data.processingTimeMs,
        },
      });

      return log.id;
    } catch (error) {
      logger.warn('Failed to log AI decision', { error });
      return null;
    }
  }

  /**
   * Atualiza o outcome de uma decisão da IA
   * Chamado quando sabemos se a decisão foi correta ou não
   */
  static async updateDecisionOutcome(
    decisionLogId: string,
    outcome: {
      wasCorrectDecision?: boolean;
      humanOverride?: boolean;
      finalOutcome?: string;
    }
  ): Promise<void> {
    try {
      await prisma.mLAIDecisionLog.update({
        where: { id: decisionLogId },
        data: {
          wasCorrectDecision: outcome.wasCorrectDecision,
          humanOverride: outcome.humanOverride,
          finalOutcome: outcome.finalOutcome,
        },
      });
    } catch (error) {
      logger.warn('Failed to update decision outcome', {
        decisionLogId,
        error,
      });
    }
  }

  /**
   * Calcula e atualiza métricas diárias de uma empresa
   */
  static async updateDailyMetrics(companyId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Contar tickets do dia
      const [totalTickets, aiHandledTickets, aiToHumanTransfers] = await Promise.all([
        prisma.ticket.count({
          where: {
            companyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.ticket.count({
          where: {
            companyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['RESOLVED', 'CLOSED'] },
            humanTakeoverAt: null,
            isAIHandled: true,
          },
        }),
        prisma.ticketTransfer.count({
          where: {
            ticket: { companyId },
            transferType: 'AI_TO_HUMAN',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

      const humanHandledTickets = totalTickets - aiHandledTickets;
      const resolvedTickets = await prisma.ticket.count({
        where: {
          companyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      });

      const aiResolutionRate = resolvedTickets > 0
        ? (aiHandledTickets / resolvedTickets) * 100
        : 0;

      // Upsert métricas
      await prisma.mLLearningMetric.upsert({
        where: {
          companyId_date: {
            companyId,
            date: today,
          },
        },
        create: {
          companyId,
          date: today,
          totalTickets,
          aiHandledTickets,
          humanHandledTickets,
          aiToHumanTransfers,
          aiResolutionRate,
        },
        update: {
          totalTickets,
          aiHandledTickets,
          humanHandledTickets,
          aiToHumanTransfers,
          aiResolutionRate,
        },
      });
    } catch (error) {
      logger.warn('Failed to update daily metrics', { companyId, error });
    }
  }
}
