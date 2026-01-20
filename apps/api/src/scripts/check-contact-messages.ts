import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

const phoneNumber = process.argv[2] || '5513997633269';

async function checkContactMessages() {
  try {
    logger.info(`Checking messages for contact: ${phoneNumber}`);

    // Find contact by phone
    const contact = await prisma.contact.findFirst({
      where: {
        phone: {
          contains: phoneNumber,
        },
      },
      include: {
        tickets: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 50,
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    isAI: true,
                  },
                },
                connection: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                    isActive: true,
                  },
                },
              },
            },
            connection: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                isActive: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!contact) {
      logger.error(`Contact not found with phone: ${phoneNumber}`);
      process.exit(1);
    }

    logger.info(`\n=== Contact Information ===`);
    logger.info(`ID: ${contact.id}`);
    logger.info(`Name: ${contact.name || 'N/A'}`);
    logger.info(`Phone: ${contact.phone}`);
    logger.info(`Company ID: ${contact.companyId}`);
    logger.info(`Is Active: ${contact.isActive}`);
    logger.info(`Last Message At: ${contact.lastMessageAt || 'N/A'}`);

    logger.info(`\n=== Tickets (${contact.tickets.length}) ===`);
    for (const ticket of contact.tickets) {
      logger.info(`\n--- Ticket: ${ticket.protocol} (${ticket.id}) ---`);
      logger.info(`Status: ${ticket.status}`);
      logger.info(`Priority: ${ticket.priority}`);
      logger.info(`Created: ${ticket.createdAt}`);
      logger.info(`Updated: ${ticket.updatedAt}`);
      logger.info(`Connection: ${ticket.connection.name} (${ticket.connection.type}) - Status: ${ticket.connection.status}, Active: ${ticket.connection.isActive}`);
      logger.info(`Messages: ${ticket.messages.length}`);

      // Check for failed messages
      const failedMessages = ticket.messages.filter(m => m.status === 'FAILED');
      if (failedMessages.length > 0) {
        logger.info(`\n⚠️  FAILED MESSAGES (${failedMessages.length}):`);
        for (const msg of failedMessages) {
          logger.info(`  - ID: ${msg.id}`);
          logger.info(`    Type: ${msg.type}`);
          logger.info(`    Content: ${msg.content?.substring(0, 100) || 'N/A'}`);
          logger.info(`    Status: ${msg.status}`);
          logger.info(`    Failed Reason: ${(msg as any).failedReason || 'N/A'}`);
          logger.info(`    Created: ${msg.createdAt}`);
          logger.info(`    Connection: ${msg.connection.name} (${msg.connection.type}) - Status: ${msg.connection.status}`);
        }
      }

      // Check for pending messages
      const pendingMessages = ticket.messages.filter(m => m.status === 'PENDING' && m.isFromMe);
      if (pendingMessages.length > 0) {
        logger.info(`\n⏳ PENDING MESSAGES (${pendingMessages.length}):`);
        for (const msg of pendingMessages) {
          logger.info(`  - ID: ${msg.id}`);
          logger.info(`    Type: ${msg.type}`);
          logger.info(`    Content: ${msg.content?.substring(0, 100) || 'N/A'}`);
          logger.info(`    Status: ${msg.status}`);
          logger.info(`    Created: ${msg.createdAt}`);
          logger.info(`    Connection: ${msg.connection.name} (${msg.connection.type}) - Status: ${msg.connection.status}`);
        }
      }

      // Show recent messages
      logger.info(`\n📨 Recent Messages (last 10):`);
      for (const msg of ticket.messages.slice(0, 10)) {
        const senderName = msg.sender?.name || (msg.isFromMe ? 'You' : 'Contact');
        const aiTag = msg.isAIGenerated ? ' [AI]' : '';
        logger.info(`  [${msg.createdAt.toISOString()}] ${senderName}${aiTag}: ${msg.status} - ${msg.type}`);
        if (msg.content) {
          logger.info(`    Content: ${msg.content.substring(0, 150)}`);
        }
        if (msg.failedReason) {
          logger.info(`    ❌ Failed: ${msg.failedReason}`);
        }
        if (msg.wamid) {
          logger.info(`    WAMID: ${msg.wamid}`);
        }
      }
    }

    // Check connection status
    logger.info(`\n=== Connection Status ===`);
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        companyId: contact.companyId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        isActive: true,
        lastConnected: true,
      },
    });

    for (const conn of connections) {
      logger.info(`${conn.name} (${conn.type}): ${conn.status} - Active: ${conn.isActive} - Last Connected: ${conn.lastConnected || 'N/A'}`);
    }

    // Check for messages that should have been sent but weren't
    const allTickets = contact.tickets;
    let totalFailed = 0;
    let totalPending = 0;
    for (const ticket of allTickets) {
      const messages = await prisma.message.findMany({
        where: {
          ticketId: ticket.id,
          isFromMe: true,
        },
      });
      totalFailed += messages.filter(m => m.status === 'FAILED').length;
      totalPending += messages.filter(m => m.status === 'PENDING').length;
    }

    logger.info(`\n=== Summary ===`);
    logger.info(`Total Failed Messages: ${totalFailed}`);
    logger.info(`Total Pending Messages: ${totalPending}`);

    if (totalFailed > 0 || totalPending > 0) {
      logger.info(`\n⚠️  ISSUES DETECTED:`);
      if (totalFailed > 0) {
        logger.info(`  - ${totalFailed} messages failed to send`);
      }
      if (totalPending > 0) {
        logger.info(`  - ${totalPending} messages are still pending`);
      }
    }

  } catch (error) {
    logger.error('Error checking contact messages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkContactMessages();

