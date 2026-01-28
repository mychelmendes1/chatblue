import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { EmbeddingService } from '../ai/embedding.service.js';
import type { Message, Ticket, MLComplexity } from '@prisma/client';

export interface CollectionCriteria {
  minResponseLength: number;
  maxResponseTime: number; // em segundos
  requireResolved: boolean;
  minRating: number | null;
  excludeTemplateResponses: boolean;
}

export interface CollectedPair {
  customerMessageId: string;
  customerQuery: string;
  agentMessageId: string;
  agentResponse: string;
  agentId: string;
  ticketId: string;
  responseTime: number;
  wasAIAssisted: boolean;
  aiSuggestionUsed: boolean | null;
  aiSuggestionEdited: boolean | null;
}

const DEFAULT_CRITERIA: CollectionCriteria = {
  minResponseLength: 20,
  maxResponseTime: 3600, // 1 hora
  requireResolved: false,
  minRating: null,
  excludeTemplateResponses: true,
};

/**
 * Service responsável por coletar pares de treinamento (pergunta do cliente + resposta do atendente)
 * de alta qualidade para treinar o sistema de ML
 */
export class TrainingPairCollectorService {
  private embeddingService: EmbeddingService | null = null;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService || null;
  }

  /**
   * Coleta pares de treinamento de um ticket específico
   */
  async collectFromTicket(
    ticketId: string,
    companyId: string,
    criteria: Partial<CollectionCriteria> = {}
  ): Promise<CollectedPair[]> {
    const opts = { ...DEFAULT_CRITERIA, ...criteria };
    const collectedPairs: CollectedPair[] = [];

    try {
      // Buscar todas as mensagens do ticket
      const messages = await prisma.message.findMany({
        where: {
          ticketId,
          deletedAt: null,
          type: 'TEXT', // Apenas mensagens de texto por enquanto
        },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              isAI: true,
            },
          },
        },
      });

      // Agrupar mensagens em pares (cliente -> atendente)
      for (let i = 0; i < messages.length - 1; i++) {
        const customerMessage = messages[i];
        const agentMessage = messages[i + 1];

        // Validar que é um par válido (cliente seguido de atendente humano)
        if (
          customerMessage.isFromMe || // Mensagem deve ser do cliente (não enviada por nós)
          !agentMessage.isFromMe || // Resposta deve ser nossa
          !agentMessage.sender || // Deve ter um sender
          agentMessage.sender.isAI || // Não deve ser resposta de IA
          agentMessage.isAIGenerated // Não deve ser gerada por IA
        ) {
          continue;
        }

        // Validar conteúdo
        if (
          !customerMessage.content ||
          !agentMessage.content ||
          agentMessage.content.length < opts.minResponseLength
        ) {
          continue;
        }

        // Calcular tempo de resposta
        const responseTime = Math.floor(
          (agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime()) / 1000
        );

        // Validar tempo de resposta
        if (responseTime > opts.maxResponseTime || responseTime < 0) {
          continue;
        }

        // Excluir respostas que parecem templates
        if (opts.excludeTemplateResponses && this.looksLikeTemplate(agentMessage.content)) {
          continue;
        }

        // Verificar se usou assistente IA
        const aiAssistData = await this.checkAIAssistance(ticketId, customerMessage.id, agentMessage.createdAt);

        collectedPairs.push({
          customerMessageId: customerMessage.id,
          customerQuery: customerMessage.content,
          agentMessageId: agentMessage.id,
          agentResponse: agentMessage.content,
          agentId: agentMessage.sender.id,
          ticketId,
          responseTime,
          wasAIAssisted: aiAssistData.wasAssisted,
          aiSuggestionUsed: aiAssistData.suggestionUsed,
          aiSuggestionEdited: aiAssistData.suggestionEdited,
        });
      }

      logger.debug('Collected training pairs from ticket', {
        ticketId,
        pairsFound: collectedPairs.length,
      });

      return collectedPairs;
    } catch (error: any) {
      logger.error('Failed to collect training pairs from ticket', {
        ticketId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Coleta e salva pares de treinamento de tickets recentes
   */
  async collectFromRecentTickets(
    companyId: string,
    options: {
      hoursBack?: number;
      maxTickets?: number;
      criteria?: Partial<CollectionCriteria>;
    } = {}
  ): Promise<{ collected: number; saved: number }> {
    const hoursBack = options.hoursBack || 24;
    const maxTickets = options.maxTickets || 100;
    const criteria = options.criteria || {};

    const sinceDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      // Buscar tickets com atividade recente que tiveram atendimento humano
      const tickets = await prisma.ticket.findMany({
        where: {
          companyId,
          updatedAt: { gte: sinceDate },
          // Apenas tickets que tiveram atendimento humano em algum momento
          humanTakeoverAt: { not: null },
        },
        select: {
          id: true,
          status: true,
          rating: true,
          npsScore: true,
          isFirstContactResolution: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: maxTickets,
      });

      let collected = 0;
      let saved = 0;

      for (const ticket of tickets) {
        // Aplicar filtro de rating se especificado
        if (criteria.minRating && (!ticket.rating || ticket.rating < criteria.minRating)) {
          continue;
        }

        // Coletar pares do ticket
        const pairs = await this.collectFromTicket(ticket.id, companyId, criteria);
        collected += pairs.length;

        // Salvar cada par
        for (const pair of pairs) {
          const wasSaved = await this.saveTrainingPair(companyId, pair, ticket);
          if (wasSaved) saved++;
        }
      }

      logger.info('Collected training pairs from recent tickets', {
        companyId,
        ticketsProcessed: tickets.length,
        pairsCollected: collected,
        pairsSaved: saved,
      });

      return { collected, saved };
    } catch (error: any) {
      logger.error('Failed to collect from recent tickets', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Salva um par de treinamento no banco de dados
   */
  async saveTrainingPair(
    companyId: string,
    pair: CollectedPair,
    ticketData: {
      status: string;
      rating: number | null;
      npsScore: number | null;
      isFirstContactResolution: boolean;
    }
  ): Promise<boolean> {
    try {
      // Verificar se já existe um par com esta mensagem do cliente
      const existing = await prisma.mLTrainingPair.findFirst({
        where: {
          companyId,
          customerMessageId: pair.customerMessageId,
        },
      });

      if (existing) {
        logger.debug('Training pair already exists', {
          customerMessageId: pair.customerMessageId,
        });
        return false;
      }

      // Gerar embedding da pergunta do cliente
      let customerEmbedding: number[] = [];
      if (this.embeddingService) {
        try {
          const embeddingResult = await this.embeddingService.generateEmbedding(pair.customerQuery);
          customerEmbedding = embeddingResult.embedding;
        } catch (error) {
          logger.warn('Failed to generate embedding for training pair', {
            customerMessageId: pair.customerMessageId,
          });
        }
      }

      // Detectar complexidade baseado no tamanho e estrutura
      const complexity = this.detectComplexity(pair.customerQuery);

      // Criar o registro
      await prisma.mLTrainingPair.create({
        data: {
          companyId,
          ticketId: pair.ticketId,
          customerMessageId: pair.customerMessageId,
          customerQuery: pair.customerQuery,
          customerEmbedding,
          agentMessageId: pair.agentMessageId,
          agentResponse: pair.agentResponse,
          agentId: pair.agentId,
          responseTime: pair.responseTime,
          wasAIAssisted: pair.wasAIAssisted,
          aiSuggestionUsed: pair.aiSuggestionUsed,
          aiSuggestionEdited: pair.aiSuggestionEdited,
          complexity,
          ticketResolved: ticketData.status === 'RESOLVED' || ticketData.status === 'CLOSED',
          customerRating: ticketData.rating,
          npsScore: ticketData.npsScore,
          firstContactResolution: ticketData.isFirstContactResolution,
        },
      });

      logger.debug('Training pair saved', {
        customerMessageId: pair.customerMessageId,
        companyId,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to save training pair', {
        customerMessageId: pair.customerMessageId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Coleta pares de transferências AI -> Humano (casos onde a IA não conseguiu responder)
   */
  async collectFromAITransfers(
    companyId: string,
    options: {
      hoursBack?: number;
      maxTransfers?: number;
    } = {}
  ): Promise<{ collected: number; saved: number }> {
    const hoursBack = options.hoursBack || 24;
    const maxTransfers = options.maxTransfers || 50;

    const sinceDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      // Buscar transferências AI -> Humano
      const transfers = await prisma.ticketTransfer.findMany({
        where: {
          ticket: {
            companyId,
          },
          transferType: 'AI_TO_HUMAN',
          createdAt: { gte: sinceDate },
        },
        include: {
          ticket: {
            select: {
              id: true,
              status: true,
              rating: true,
              npsScore: true,
              isFirstContactResolution: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: maxTransfers,
      });

      let collected = 0;
      let saved = 0;

      for (const transfer of transfers) {
        // Buscar a última mensagem do cliente antes da transferência
        // e a primeira resposta do atendente humano após a transferência
        const messagesAroundTransfer = await prisma.message.findMany({
          where: {
            ticketId: transfer.ticket.id,
            deletedAt: null,
            type: 'TEXT',
            createdAt: {
              gte: new Date(transfer.createdAt.getTime() - 5 * 60 * 1000), // 5 min antes
              lte: new Date(transfer.createdAt.getTime() + 30 * 60 * 1000), // 30 min depois
            },
          },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                isAI: true,
              },
            },
          },
        });

        // Encontrar o par relevante
        let customerMessage: typeof messagesAroundTransfer[0] | null = null;
        let agentMessage: typeof messagesAroundTransfer[0] | null = null;

        for (const msg of messagesAroundTransfer) {
          if (!msg.isFromMe && msg.createdAt <= transfer.createdAt) {
            customerMessage = msg; // Última mensagem do cliente antes da transferência
          }
          if (
            msg.isFromMe &&
            msg.sender &&
            !msg.sender.isAI &&
            msg.createdAt > transfer.createdAt &&
            !agentMessage
          ) {
            agentMessage = msg; // Primeira resposta humana após transferência
            break;
          }
        }

        if (customerMessage && agentMessage && customerMessage.content && agentMessage.content) {
          collected++;

          const pair: CollectedPair = {
            customerMessageId: customerMessage.id,
            customerQuery: customerMessage.content,
            agentMessageId: agentMessage.id,
            agentResponse: agentMessage.content,
            agentId: agentMessage.sender!.id,
            ticketId: transfer.ticket.id,
            responseTime: Math.floor(
              (agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime()) / 1000
            ),
            wasAIAssisted: false, // Transferência indica que IA não ajudou
            aiSuggestionUsed: false,
            aiSuggestionEdited: false,
          };

          const wasSaved = await this.saveTrainingPair(companyId, pair, transfer.ticket);
          if (wasSaved) saved++;
        }
      }

      logger.info('Collected training pairs from AI transfers', {
        companyId,
        transfersProcessed: transfers.length,
        pairsCollected: collected,
        pairsSaved: saved,
      });

      return { collected, saved };
    } catch (error: any) {
      logger.error('Failed to collect from AI transfers', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verifica se o atendente usou o assistente IA para responder
   */
  private async checkAIAssistance(
    ticketId: string,
    customerMessageId: string,
    agentResponseTime: Date
  ): Promise<{
    wasAssisted: boolean;
    suggestionUsed: boolean | null;
    suggestionEdited: boolean | null;
  }> {
    try {
      // Buscar queries do assistente IA feitas próximo ao momento da resposta
      const aiQuery = await prisma.aIAssistantQuery.findFirst({
        where: {
          ticketId,
          createdAt: {
            gte: new Date(agentResponseTime.getTime() - 5 * 60 * 1000), // 5 min antes
            lte: agentResponseTime,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!aiQuery) {
        return {
          wasAssisted: false,
          suggestionUsed: null,
          suggestionEdited: null,
        };
      }

      return {
        wasAssisted: true,
        suggestionUsed: aiQuery.wasUsed,
        suggestionEdited: aiQuery.wasEdited,
      };
    } catch (error) {
      return {
        wasAssisted: false,
        suggestionUsed: null,
        suggestionEdited: null,
      };
    }
  }

  /**
   * Detecta se uma resposta parece ser um template padrão
   */
  private looksLikeTemplate(content: string): boolean {
    const templatePatterns = [
      /^(olá|oi|bom dia|boa tarde|boa noite)[,!]?\s*$/i,
      /^obrigad[oa].*atendimento[.!]?\s*$/i,
      /^aguarde um momento/i,
      /^estamos verificando/i,
      /^vou transferir/i,
    ];

    return templatePatterns.some(pattern => pattern.test(content.trim()));
  }

  /**
   * Detecta a complexidade de uma pergunta
   */
  private detectComplexity(query: string): MLComplexity {
    const wordCount = query.split(/\s+/).length;
    const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
    const hasConjunctions = /\b(e|também|além|inclusive|outro|outra)\b/i.test(query);

    if (wordCount <= 10 && !hasMultipleQuestions && !hasConjunctions) {
      return 'SIMPLE';
    }

    if (wordCount > 30 || hasMultipleQuestions || (hasConjunctions && wordCount > 15)) {
      return 'COMPLEX';
    }

    return 'MEDIUM';
  }

  /**
   * Obtém estatísticas de pares de treinamento
   */
  async getStats(companyId: string): Promise<{
    total: number;
    validated: number;
    usedInTraining: number;
    avgQualityScore: number | null;
    byCategory: Record<string, number>;
    byComplexity: Record<string, number>;
  }> {
    const [total, validated, usedInTraining, avgScore, categoryStats, complexityStats] = await Promise.all([
      prisma.mLTrainingPair.count({ where: { companyId } }),
      prisma.mLTrainingPair.count({ where: { companyId, isValidated: true } }),
      prisma.mLTrainingPair.count({ where: { companyId, usedInTraining: true } }),
      prisma.mLTrainingPair.aggregate({
        where: { companyId, qualityScore: { not: null } },
        _avg: { qualityScore: true },
      }),
      prisma.mLTrainingPair.groupBy({
        by: ['category'],
        where: { companyId, category: { not: null } },
        _count: true,
      }),
      prisma.mLTrainingPair.groupBy({
        by: ['complexity'],
        where: { companyId },
        _count: true,
      }),
    ]);

    return {
      total,
      validated,
      usedInTraining,
      avgQualityScore: avgScore._avg.qualityScore,
      byCategory: Object.fromEntries(categoryStats.map(s => [s.category || 'unknown', s._count])),
      byComplexity: Object.fromEntries(complexityStats.map(s => [s.complexity, s._count])),
    };
  }
}
