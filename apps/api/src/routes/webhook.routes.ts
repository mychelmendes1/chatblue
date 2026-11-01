import { Router } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { MessageProcessor } from '../services/message-processor.service.js';
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service.js';
import { verifyMetaSignature } from '../utils/meta-signature.util.js';
import { addInstagramWebhookJob } from '../jobs/index.js';
import { instagramWebhookProcessor } from '../jobs/processors/instagram-webhook.processor.js';
import { translateMetaError, getErrorSuggestion } from '../utils/meta-error-translator.js';
import { getGlobalIo } from '../server.js';

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

            // Process status updates (only for META_CLOUD connections)
            // Baileys connections handle status updates via Baileys events, not Meta webhooks
            if (value.statuses && connection.type === 'META_CLOUD') {
              for (const status of value.statuses) {
                const statusMap: Record<string, string> = {
                  sent: 'SENT',
                  delivered: 'DELIVERED',
                  read: 'READ',
                  failed: 'FAILED',
                };

                const mappedStatus = statusMap[status.status] || status.status.toUpperCase();

                const errorMessage = status.errors?.[0]?.message || 'Unknown error';
                
                const updateResult = await prisma.message.updateMany({
                  where: { wamid: status.id },
                  data: {
                    status: mappedStatus,
                    ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                    ...(status.status === 'read' && { readAt: new Date() }),
                    ...(status.status === 'failed' && {
                      failedReason: errorMessage,
                    }),
                  },
                });

                // Emit socket event for ALL status updates (not just failures)
                if (updateResult.count > 0) {
                  // Find the message to get ticketId
                  const updatedMessage = await prisma.message.findFirst({
                    where: { wamid: status.id },
                    select: { id: true, ticketId: true },
                  });
                  
                  if (updatedMessage) {
                    const io = getGlobalIo();
                    if (io) {
                      if (status.status === 'failed') {
                        const translatedError = translateMetaError(errorMessage);
                        const suggestion = getErrorSuggestion(errorMessage);
                        
                        logger.error('Message delivery failed:', {
                          messageId: status.id,
                          errors: status.errors,
                          translatedError,
                        });
                        
                        // Emit error event to the ticket room
                        io.to(`ticket:${updatedMessage.ticketId}`).emit('message:error', {
                          messageId: updatedMessage.id,
                          wamid: status.id,
                          error: translatedError,
                          suggestion: suggestion,
                          originalError: errorMessage,
                        });
                        
                        // Also emit status update
                        io.to(`ticket:${updatedMessage.ticketId}`).emit('message:status', {
                          messageId: updatedMessage.id,
                          wamid: status.id,
                          status: 'FAILED',
                          translatedError,
                          suggestion,
                        });
                      } else {
                        // Emit status update for sent, delivered, read
                        logger.debug(`Message status updated: ${status.id} -> ${mappedStatus}`);
                        
                        io.to(`ticket:${updatedMessage.ticketId}`).emit('message:status', {
                          messageId: updatedMessage.id,
                          wamid: status.id,
                          status: mappedStatus,
                        });
                      }
                    }
                  }
                } else if (status.status === 'failed') {
                  // Message not found - might be from a different connection type (e.g., Baileys)
                  logger.debug(`Message status update skipped: message ${status.id} not found (might be Baileys message)`);
                }
              }
            } else if (value.statuses && connection.type === 'BAILEYS') {
              // Ignore Meta status updates for Baileys connections
              logger.debug(`Ignoring Meta webhook status updates for Baileys connection: ${connection.id}`);
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

// ============================================
// INSTAGRAM WEBHOOKS
// ============================================
// Webhook ÚNICO do app (Instagram API with Instagram Login): a Meta aceita uma URL de callback
// por app, então o roteamento para a conexão é feito pelo `entry.id` (ID da conta Instagram)
// no processador da fila `instagram-webhook`.

let warnedMissingAppSecret = false;

/** Handler comum do POST (webhook único e rota legada por conexão) */
async function handleInstagramWebhookPost(req: any, res: any): Promise<void> {
  const signature = verifyMetaSignature(req.rawBody, req.get('x-hub-signature-256'));
  if (signature.skipped && !warnedMissingAppSecret) {
    warnedMissingAppSecret = true;
    logger.warn('[IG Webhook] META_APP_SECRET não definido: assinatura X-Hub-Signature-256 NÃO está sendo validada');
  }
  if (!signature.valid) {
    logger.warn('[IG Webhook] Assinatura inválida, requisição rejeitada', { ip: req.ip, path: req.originalUrl });
    res.sendStatus(401);
    return;
  }

  // Responde rápido para a Meta; o processamento acontece na fila
  res.sendStatus(200);

  const body = req.body || {};
  if (body.object && body.object !== 'instagram') {
    logger.debug(`[IG Webhook] object "${body.object}" ignorado`);
    return;
  }

  const receivedAt = new Date();
  for (const entry of body.entry || []) {
    try {
      await addInstagramWebhookJob(entry, receivedAt);
    } catch (error) {
      // Sem fila (Redis fora): processa inline para não perder o evento
      logger.error('[IG Webhook] Falha ao enfileirar entry, processando inline', {
        error: (error as any)?.message || error,
      });
      try {
        await instagramWebhookProcessor({
          id: 'inline',
          data: { entry, receivedAt: receivedAt.toISOString() },
        } as any);
      } catch (inlineError) {
        logger.error('[IG Webhook] Falha no processamento inline', inlineError);
      }
    }
  }
}

// Verificação do webhook único
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && expected && token === expected) {
    logger.info('[IG Webhook] Webhook único verificado');
    return res.status(200).send(challenge);
  }
  logger.warn('[IG Webhook] Falha na verificação do webhook único', { mode, hasExpected: Boolean(expected) });
  return res.sendStatus(403);
});

// Eventos do webhook único
router.post('/instagram', (req, res) => {
  handleInstagramWebhookPost(req, res).catch((error) => {
    logger.error('Instagram webhook processing error:', error);
    if (!res.headersSent) res.sendStatus(500);
  });
});

// Instagram webhook verification (legado, por conexão)
router.get('/instagram/:connectionId', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.connectionId },
    });

    if (!connection || connection.type !== 'INSTAGRAM') {
      return res.sendStatus(404);
    }

    const globalToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
    if (
      mode === 'subscribe' &&
      token &&
      (token === connection.webhookToken || (globalToken && token === globalToken))
    ) {
      logger.info(`Instagram webhook verified for connection ${connection.id}`);
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    logger.error('Instagram webhook verification error:', error);
    return res.sendStatus(500);
  }
});

// Instagram webhook events (legado, por conexão): mesmo fluxo do webhook único,
// a conexão é resolvida pelo entry.id
router.post('/instagram/:connectionId', (req, res) => {
  handleInstagramWebhookPost(req, res).catch((error) => {
    logger.error('Instagram webhook processing error:', error);
    if (!res.headersSent) res.sendStatus(500);
  });
});

// ============================================
// BAILEYS WEBHOOKS
// ============================================

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
