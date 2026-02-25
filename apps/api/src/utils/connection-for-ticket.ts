import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Get an active connected WhatsApp/Instagram connection for a ticket.
 * If the ticket's connection is null (orphaned after session delete), not found, or not connected, finds and updates to an active one.
 */
export async function getActiveConnectionForTicket(ticket: {
  id: string;
  companyId?: string;
  connectionId?: string | null;
  company?: { id: string } | null;
}): Promise<{ connection: any; updated: boolean }> {
  const companyId = ticket.companyId || ticket.company?.id;

  if (!companyId) {
    logger.error(`Ticket ${ticket.id} has no companyId`);
    throw new Error('Ticket não possui empresa associada.');
  }

  const currentConnection = ticket.connectionId
    ? await prisma.whatsAppConnection.findUnique({
        where: { id: ticket.connectionId },
      })
    : null;

  if (currentConnection?.status === 'CONNECTED' && currentConnection?.isActive) {
    return { connection: currentConnection, updated: false };
  }

  if (currentConnection) {
    logger.warn(
      `Ticket ${ticket.id} connection ${currentConnection.id} (${currentConnection.name}) is not connected (status: ${currentConnection.status}, isActive: ${currentConnection.isActive}). Looking for active connection...`
    );
  } else {
    logger.warn(`Ticket ${ticket.id} has no connection or connection was removed. Looking for active connection for company...`);
  }

  let activeConnection = currentConnection
    ? await prisma.whatsAppConnection.findFirst({
        where: {
          companyId,
          status: 'CONNECTED',
          isActive: true,
          type: currentConnection.type,
        },
        orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
      })
    : null;

  if (!activeConnection) {
    activeConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId,
        status: 'CONNECTED',
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
    });
  }

  if (!activeConnection) {
    const availableConnections = await prisma.whatsAppConnection.findMany({
      where: { companyId },
      select: { id: true, name: true, status: true, isActive: true, type: true },
    });
    logger.error(`No active connection found for company ${companyId}. Available connections:`, availableConnections);
    throw new Error('WhatsApp não conectado. Por favor, conecte o WhatsApp primeiro escaneando o QR Code.');
  }

  logger.info(`Found active connection ${activeConnection.id} (${activeConnection.name}, type: ${activeConnection.type}) for ticket ${ticket.id}. Updating ticket to use new connection.`);

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { connectionId: activeConnection.id },
  });

  return { connection: activeConnection, updated: true };
}
