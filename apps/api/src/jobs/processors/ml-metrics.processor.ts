import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

interface MLMetricsJobData {
  type: 'calculate-daily' | 'calculate-resolution-rate';
  companyId?: string;
  date?: string; // ISO date string
}

/**
 * Processor para cálculo de métricas de aprendizado
 */
export async function mlMetricsProcessor(job: Job<MLMetricsJobData>) {
  const { type, companyId, date } = job.data;

  logger.info('ML metrics job started', {
    jobId: job.id,
    type,
    companyId,
  });

  try {
    // Buscar empresas para processar
    const companies = companyId
      ? [{ id: companyId }]
      : await prisma.company.findMany({
          where: {
            isActive: true,
            settings: {
              aiEnabled: true,
            },
          },
          select: { id: true },
        });

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let companiesProcessed = 0;

    for (const company of companies) {
      companiesProcessed++;

      // Calcular métricas de tickets
      const ticketMetrics = await calculateTicketMetrics(
        company.id,
        startOfDay,
        endOfDay
      );

      // Calcular métricas de qualidade da IA
      const aiMetrics = await calculateAIMetrics(
        company.id,
        startOfDay,
        endOfDay
      );

      // Buscar métricas do dia anterior para calcular delta
      const previousDay = new Date(targetDate);
      previousDay.setDate(previousDay.getDate() - 1);

      const previousMetrics = await prisma.mLLearningMetric.findUnique({
        where: {
          companyId_date: {
            companyId: company.id,
            date: previousDay,
          },
        },
        select: { aiResolutionRate: true },
      });

      const aiResolutionRateDelta = previousMetrics?.aiResolutionRate
        ? ticketMetrics.aiResolutionRate - previousMetrics.aiResolutionRate
        : null;

      // Upsert métricas
      await prisma.mLLearningMetric.upsert({
        where: {
          companyId_date: {
            companyId: company.id,
            date: targetDate,
          },
        },
        create: {
          companyId: company.id,
          date: targetDate,
          ...ticketMetrics,
          ...aiMetrics,
          aiResolutionRateDelta,
        },
        update: {
          ...ticketMetrics,
          ...aiMetrics,
          aiResolutionRateDelta,
        },
      });

      logger.debug('Metrics calculated for company', {
        companyId: company.id,
        date: targetDate.toISOString(),
        ...ticketMetrics,
      });
    }

    logger.info('ML metrics job completed', {
      jobId: job.id,
      type,
      companiesProcessed,
      date: targetDate.toISOString(),
    });

    return { companiesProcessed, date: targetDate.toISOString() };
  } catch (error: any) {
    logger.error('ML metrics job failed', {
      jobId: job.id,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Calcula métricas de tickets
 */
async function calculateTicketMetrics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalTickets: number;
  aiHandledTickets: number;
  humanHandledTickets: number;
  aiToHumanTransfers: number;
  aiResolutionRate: number;
}> {
  // Total de tickets criados no período
  const totalTickets = await prisma.ticket.count({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Tickets resolvidos apenas com IA (nunca teve humanTakeover)
  const aiHandledTickets = await prisma.ticket.count({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ['RESOLVED', 'CLOSED'] },
      humanTakeoverAt: null,
      isAIHandled: true,
    },
  });

  // Tickets que tiveram atendimento humano
  const humanHandledTickets = await prisma.ticket.count({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      humanTakeoverAt: { not: null },
    },
  });

  // Transferências AI -> Humano
  const aiToHumanTransfers = await prisma.ticketTransfer.count({
    where: {
      ticket: {
        companyId,
      },
      transferType: 'AI_TO_HUMAN',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Tickets resolvidos (para calcular taxa de resolução)
  const resolvedTickets = await prisma.ticket.count({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ['RESOLVED', 'CLOSED'] },
    },
  });

  // Taxa de resolução pela IA
  const aiResolutionRate = resolvedTickets > 0
    ? (aiHandledTickets / resolvedTickets) * 100
    : 0;

  return {
    totalTickets,
    aiHandledTickets,
    humanHandledTickets,
    aiToHumanTransfers,
    aiResolutionRate: Math.round(aiResolutionRate * 100) / 100,
  };
}

/**
 * Calcula métricas de qualidade da IA
 */
async function calculateAIMetrics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  aiAvgRating: number | null;
  aiNpsScore: number | null;
  intentAccuracy: number | null;
  templateMatchRate: number | null;
}> {
  // Rating médio quando IA resolve
  const aiRatings = await prisma.ticket.aggregate({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      humanTakeoverAt: null,
      isAIHandled: true,
      rating: { not: null },
    },
    _avg: { rating: true },
  });

  // NPS médio quando IA resolve
  const aiNps = await prisma.ticket.aggregate({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      humanTakeoverAt: null,
      isAIHandled: true,
      npsScore: { not: null },
    },
    _avg: { npsScore: true },
  });

  // Estatísticas de AI Assistant queries
  const aiQueryStats = await prisma.aIAssistantQuery.aggregate({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
    _count: true,
    _avg: {
      categoryConfidence: true,
    },
  });

  // Queries que foram usadas vs total
  const usedQueries = await prisma.aIAssistantQuery.count({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
      wasUsed: true,
    },
  });

  // Templates utilizados
  const templateUsage = await prisma.mLResponseTemplate.aggregate({
    where: {
      companyId,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: { usageCount: true },
  });

  // Taxa de match de template
  const templateMatchRate = aiQueryStats._count > 0
    ? (usedQueries / aiQueryStats._count) * 100
    : null;

  return {
    aiAvgRating: aiRatings._avg.rating,
    aiNpsScore: aiNps._avg.npsScore,
    intentAccuracy: aiQueryStats._avg.categoryConfidence
      ? aiQueryStats._avg.categoryConfidence * 100
      : null,
    templateMatchRate: templateMatchRate
      ? Math.round(templateMatchRate * 100) / 100
      : null,
  };
}
