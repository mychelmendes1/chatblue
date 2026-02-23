import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import crypto from 'crypto';

export class NPSService {
  /**
   * Send NPS survey automatically when ticket is resolved/closed
   */
  static async sendNPSSurvey(ticketId: string): Promise<void> {
    try {
      // Get ticket with contact and connection
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          contact: true,
          connection: true,
          company: {
            include: {
              settings: true,
            },
          },
        },
      });

      if (!ticket) {
        logger.warn(`Ticket ${ticketId} not found for NPS survey`);
        return;
      }

      // Check if NPS is enabled for this company
      // For now, we'll check if there's a setting or default to enabled
      // You can add a setting in CompanySettings if needed
      const settings = ticket.company.settings;
      // TODO: Add npsEnabled to CompanySettings if needed
      // if (settings && !settings.npsEnabled) {
      //   logger.debug(`NPS disabled for company ${ticket.companyId}`);
      //   return;
      // }

      // Don't send if already rated (npsRatedAt means user already answered)
      if (ticket.npsRatedAt) {
        logger.debug(`NPS already answered for ticket ${ticket.protocol}`);
        return;
      }

      // Don't send if token already exists (means we already sent the survey)
      if (ticket.npsToken) {
        logger.debug(`NPS survey already sent for ticket ${ticket.protocol}`);
        return;
      }

      // Don't send NPS if there was no real conversation (no messages from the contact)
      const contactMessageCount = await prisma.message.count({
        where: {
          ticketId,
          isFromMe: false,
          type: { not: 'SYSTEM' },
        },
      });

      if (contactMessageCount === 0) {
        logger.info(`NPS skipped for ticket ${ticket.protocol}: no messages from contact`);
        return;
      }

      // Generate unique token for NPS survey
      const token = crypto.randomBytes(32).toString('hex');
      const baseUrl = process.env.FRONTEND_URL || process.env.WEB_URL || 'https://chat.grupoblue.com.br';
      const npsUrl = `${baseUrl}/nps/${token}`;

      // Update ticket with NPS token
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          npsToken: token,
        },
      });

      // Prepare message
      const contactName = ticket.contact.name || 'Cliente';
      const message = `📊 Olá ${contactName}!

Agradecemos pelo contato. Nos ajude a melhorar nossos serviços respondendo uma pesquisa rápida:

${npsUrl}

Sua opinião é muito importante para nós! 😊`;

      // Send message via WhatsApp
      const whatsappService = new WhatsAppService(ticket.connection);

      try {
        const result = await whatsappService.sendMessage(ticket.contact.phone, message);

        // Create message record in database
        await prisma.message.create({
          data: {
            type: 'TEXT',
            content: message,
            isFromMe: true,
            isAIGenerated: false,
            isInternal: false,
            status: 'SENT',
            sentAt: new Date(),
            ticketId: ticket.id,
            connectionId: ticket.connectionId,
            wamid: result.messageId,
          },
        });

        logger.info(`NPS survey sent to ticket ${ticket.protocol} (${ticket.contact.phone})`);
      } catch (error: any) {
        logger.error(`Failed to send NPS survey for ticket ${ticket.protocol}:`, error);
        // Don't throw - we don't want to break the resolve/close flow
      }
    } catch (error: any) {
      logger.error(`Error sending NPS survey for ticket ${ticketId}:`, error);
      // Don't throw - we don't want to break the resolve/close flow
    }
  }

  /**
   * Submit NPS response from public URL
   */
  static async submitNPSResponse(token: string, score: number, comment?: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (score < 0 || score > 10) {
        return { success: false, message: 'Score deve estar entre 0 e 10' };
      }

      // Find ticket by NPS token
      const ticket = await prisma.ticket.findUnique({
        where: { npsToken: token },
      });

      if (!ticket) {
        return { success: false, message: 'Token inválido ou pesquisa já respondida' };
      }

      // Check if already answered
      if (ticket.npsRatedAt) {
        return { success: false, message: 'Pesquisa já foi respondida' };
      }

      // Update ticket with NPS data
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          npsScore: score,
          npsComment: comment || null,
          npsRatedAt: new Date(),
        },
      });

      logger.info(`NPS response received for ticket ${ticket.protocol}: ${score}`);

      return { success: true, message: 'Obrigado pela sua avaliação!' };
    } catch (error: any) {
      logger.error('Error submitting NPS response:', error);
      return { success: false, message: 'Erro ao processar resposta' };
    }
  }

  /**
   * Get NPS survey status by token (for public page)
   */
  static async getNPSStatus(token: string): Promise<{ valid: boolean; ticket?: any; alreadyAnswered?: boolean }> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { npsToken: token },
        select: {
          id: true,
          protocol: true,
          npsScore: true,
          npsRatedAt: true,
          contact: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!ticket) {
        return { valid: false };
      }

      if (ticket.npsRatedAt) {
        return { valid: true, alreadyAnswered: true, ticket };
      }

      return { valid: true, alreadyAnswered: false, ticket };
    } catch (error: any) {
      logger.error('Error getting NPS status:', error);
      return { valid: false };
    }
  }
}
