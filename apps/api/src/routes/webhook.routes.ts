import { Router } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { MessageProcessor } from '../services/message-processor.service.js';
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service.js';

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

/**
 * Extract message content and media info from Meta webhook message
 */
async function extractMetaMessageContent(
  message: any,
  connection: any
): Promise<{
  type: string;
  content: string;
  mediaUrl?: string;
  mediaId?: string;
  quotedMessageId?: string;
  reactionEmoji?: string;
  reactionMessageId?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  contacts?: any[];
  interactiveResponse?: {
    type: string;
    buttonId?: string;
    buttonText?: string;
    listId?: string;
    listTitle?: string;
    listDescription?: string;
  };
}> {
  const msgType = message.type?.toUpperCase() || 'TEXT';
  let content = '';
  let mediaUrl: string | undefined;
  let mediaId: string | undefined;
  let quotedMessageId: string | undefined;
  let reactionEmoji: string | undefined;
  let reactionMessageId: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let locationName: string | undefined;
  let locationAddress: string | undefined;
  let contacts: any[] | undefined;
  let interactiveResponse: any;

  // Get quoted message ID if this is a reply
  if (message.context?.id) {
    quotedMessageId = message.context.id;
  }

  switch (message.type) {
    case 'text':
      content = message.text?.body || '';
      break;

    case 'image':
      content = message.image?.caption || '';
      mediaId = message.image?.id;
      // Download media from Meta's temporary URL
      if (mediaId && connection) {
        try {
          const metaService = new MetaCloudService(connection);
          const { localPath } = await metaService.downloadMedia(mediaId);
          // Convert local path to URL
          const apiUrl = process.env.API_URL || 'http://localhost:3001';
          mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
        } catch (error) {
          logger.error('Failed to download image from Meta:', error);
        }
      }
      break;

    case 'video':
      content = message.video?.caption || '';
      mediaId = message.video?.id;
      if (mediaId && connection) {
        try {
          const metaService = new MetaCloudService(connection);
          const { localPath } = await metaService.downloadMedia(mediaId);
          const apiUrl = process.env.API_URL || 'http://localhost:3001';
          mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
        } catch (error) {
          logger.error('Failed to download video from Meta:', error);
        }
      }
      break;

    case 'audio':
      mediaId = message.audio?.id;
      if (mediaId && connection) {
        try {
          const metaService = new MetaCloudService(connection);
          const { localPath } = await metaService.downloadMedia(mediaId);
          const apiUrl = process.env.API_URL || 'http://localhost:3001';
          mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
        } catch (error) {
          logger.error('Failed to download audio from Meta:', error);
        }
      }
      break;

    case 'document':
      content = message.document?.caption || message.document?.filename || '';
      mediaId = message.document?.id;
      if (mediaId && connection) {
        try {
          const metaService = new MetaCloudService(connection);
          const filename = message.document?.filename;
          const { localPath } = await metaService.downloadMedia(mediaId, filename);
          const apiUrl = process.env.API_URL || 'http://localhost:3001';
          mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
        } catch (error) {
          logger.error('Failed to download document from Meta:', error);
        }
      }
      break;

    case 'sticker':
      mediaId = message.sticker?.id;
      if (mediaId && connection) {
        try {
          const metaService = new MetaCloudService(connection);
          const { localPath } = await metaService.downloadMedia(mediaId);
          const apiUrl = process.env.API_URL || 'http://localhost:3001';
          mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
        } catch (error) {
          logger.error('Failed to download sticker from Meta:', error);
        }
      }
      break;

    case 'location':
      latitude = message.location?.latitude;
      longitude = message.location?.longitude;
      locationName = message.location?.name;
      locationAddress = message.location?.address;
      content = locationName || locationAddress || `${latitude}, ${longitude}`;
      break;

    case 'contacts':
      contacts = message.contacts;
      if (contacts && contacts.length > 0) {
        content = contacts.map((c: any) => c.name?.formatted_name || 'Contact').join(', ');
      }
      break;

    case 'reaction':
      reactionEmoji = message.reaction?.emoji;
      reactionMessageId = message.reaction?.message_id;
      break;

    case 'interactive':
      // Handle button and list responses
      if (message.interactive?.type === 'button_reply') {
        interactiveResponse = {
          type: 'button',
          buttonId: message.interactive.button_reply?.id,
          buttonText: message.interactive.button_reply?.title,
        };
        content = message.interactive.button_reply?.title || '';
      } else if (message.interactive?.type === 'list_reply') {
        interactiveResponse = {
          type: 'list',
          listId: message.interactive.list_reply?.id,
          listTitle: message.interactive.list_reply?.title,
          listDescription: message.interactive.list_reply?.description,
        };
        content = message.interactive.list_reply?.title || '';
      }
      break;

    default:
      content = message.text?.body || '';
  }

  return {
    type: msgType,
    content,
    mediaUrl,
    mediaId,
    quotedMessageId,
    reactionEmoji,
    reactionMessageId,
    latitude,
    longitude,
    locationName,
    locationAddress,
    contacts,
    interactiveResponse,
  };
}

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
    logger.debug('Meta webhook received:', JSON.stringify(body, null, 2));

    // Process webhook entries
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Update last message window for the contact (24-hour rule)
            if (value.contacts) {
              for (const contact of value.contacts) {
                const phone = contact.wa_id;
                // Update contact's last message time for messaging window tracking
                await prisma.contact.updateMany({
                  where: {
                    phone: { contains: phone },
                    companyId: connection.companyId,
                  },
                  data: {
                    lastMessageAt: new Date(),
                  },
                });
              }
            }

            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                const extracted = await extractMetaMessageContent(message, connection);

                // Handle reactions separately
                if (extracted.reactionEmoji !== undefined && extracted.reactionMessageId) {
                  await handleReaction(
                    extracted.reactionMessageId,
                    extracted.reactionEmoji,
                    message.from,
                    false // From contact, not from us
                  );
                  continue;
                }

                // Process regular message
                await MessageProcessor.processIncoming({
                  connectionId: connection.id,
                  companyId: connection.companyId,
                  from: message.from,
                  wamid: message.id,
                  type: extracted.type,
                  content: extracted.content,
                  mediaUrl: extracted.mediaUrl,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  quotedMessageId: extracted.quotedMessageId,
                  metadata: {
                    latitude: extracted.latitude,
                    longitude: extracted.longitude,
                    locationName: extracted.locationName,
                    locationAddress: extracted.locationAddress,
                    contacts: extracted.contacts,
                    interactiveResponse: extracted.interactiveResponse,
                  },
                });
              }
            }

            // Process status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                const statusMap: Record<string, string> = {
                  sent: 'SENT',
                  delivered: 'DELIVERED',
                  read: 'READ',
                  failed: 'FAILED',
                };

                const mappedStatus = statusMap[status.status] || status.status.toUpperCase();

                await prisma.message.updateMany({
                  where: { wamid: status.id },
                  data: {
                    status: mappedStatus,
                    ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                    ...(status.status === 'read' && { readAt: new Date() }),
                    ...(status.status === 'failed' && {
                      failedReason: status.errors?.[0]?.message || 'Unknown error',
                    }),
                  },
                });

                // Log failures for debugging
                if (status.status === 'failed') {
                  logger.error('Message delivery failed:', {
                    messageId: status.id,
                    errors: status.errors,
                  });
                }
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

/**
 * Handle reaction to a message
 */
async function handleReaction(
  messageId: string,
  emoji: string,
  from: string,
  fromMe: boolean
): Promise<void> {
  try {
    // Find the message
    const message = await prisma.message.findFirst({
      where: { wamid: messageId },
      include: { ticket: true },
    });

    if (!message) {
      logger.warn(`Message not found for reaction: ${messageId}`);
      return;
    }

    // Store reaction (empty emoji means remove reaction)
    if (emoji) {
      // Add or update reaction
      await prisma.message.update({
        where: { id: message.id },
        data: {
          reactions: {
            push: {
              emoji,
              from,
              fromMe,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    } else {
      // Remove reaction from this sender
      const currentReactions = (message.reactions as any[]) || [];
      const filteredReactions = currentReactions.filter(
        (r) => !(r.from === from && r.fromMe === fromMe)
      );
      
      await prisma.message.update({
        where: { id: message.id },
        data: {
          reactions: filteredReactions,
        },
      });
    }

    // Emit socket event for real-time update
    const io = (global as any).io;
    if (io && message.ticket) {
      io.to(`ticket:${message.ticket.id}`).emit('message:reaction', {
        messageId: message.id,
        wamid: messageId,
        emoji,
        from,
        fromMe,
      });
    }

    logger.info(`Reaction ${emoji || '(removed)'} on message ${messageId}`);
  } catch (error) {
    logger.error('Error handling reaction:', error);
  }
}

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
