import { Router } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { MessageProcessor } from '../services/message-processor.service.js';

const router = Router();

// Meta WhatsApp webhook verification
router.get('/meta/:connectionId', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.connectionId },
    });

    if (!connection) {
      return res.sendStatus(404);
    }

    if (mode === 'subscribe' && token === connection.webhookToken) {
      logger.info(`Webhook verified for connection ${connection.id}`);
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return res.sendStatus(500);
  }
});

// Meta WhatsApp webhook events
router.post('/meta/:connectionId', async (req, res) => {
  try {
    // Always respond quickly to Meta
    res.sendStatus(200);

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.connectionId },
      include: { company: true },
    });

    if (!connection) {
      logger.warn(`Webhook for unknown connection: ${req.params.connectionId}`);
      return;
    }

    const body = req.body;

    // Process webhook entries
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await MessageProcessor.processIncoming({
                  connectionId: connection.id,
                  companyId: connection.companyId,
                  from: message.from,
                  wamid: message.id,
                  type: message.type.toUpperCase(),
                  content: message.text?.body || message.caption || '',
                  mediaUrl: message.image?.url || message.video?.url || message.audio?.url || message.document?.url,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                });
              }
            }

            // Process status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await prisma.message.updateMany({
                  where: { wamid: status.id },
                  data: {
                    status: status.status.toUpperCase(),
                    ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                    ...(status.status === 'read' && { readAt: new Date() }),
                  },
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
  }
});

// Baileys webhook (internal)
router.post('/baileys/:connectionId', async (req, res) => {
  try {
    res.sendStatus(200);

    const { event, data } = req.body;

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.connectionId },
    });

    if (!connection) {
      return;
    }

    switch (event) {
      case 'message':
        await MessageProcessor.processIncoming({
          connectionId: connection.id,
          companyId: connection.companyId,
          from: data.from,
          wamid: data.id,
          type: data.type,
          content: data.content,
          mediaUrl: data.mediaUrl,
          timestamp: new Date(data.timestamp),
        });
        break;

      case 'message_status':
        await prisma.message.updateMany({
          where: { wamid: data.id },
          data: {
            status: data.status,
            ...(data.status === 'DELIVERED' && { deliveredAt: new Date() }),
            ...(data.status === 'READ' && { readAt: new Date() }),
          },
        });
        break;

      case 'connection_update':
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: data.status,
            ...(data.status === 'CONNECTED' && {
              lastConnected: new Date(),
              phone: data.phone,
            }),
          },
        });
        break;
    }
  } catch (error) {
    logger.error('Baileys webhook error:', error);
  }
});

export { router as webhookRouter };
