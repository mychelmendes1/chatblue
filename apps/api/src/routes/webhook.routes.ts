import { Router } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { MessageProcessor } from '../services/message-processor.service.js';
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service.js';
import { InstagramService } from '../services/instagram/instagram.service.js';
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

                // If message failed, emit socket event with translated error
                if (status.status === 'failed' && updateResult.count > 0) {
                  const translatedError = translateMetaError(errorMessage);
                  const suggestion = getErrorSuggestion(errorMessage);
                  
                  logger.error('Message delivery failed:', {
                    messageId: status.id,
                    errors: status.errors,
                    translatedError,
                  });
                  
                  // Find the message to get ticketId
                  const failedMessage = await prisma.message.findFirst({
                    where: { wamid: status.id },
                    select: { id: true, ticketId: true },
                  });
                  
                  if (failedMessage) {
                    const io = getGlobalIo();
                    if (io) {
                      // Emit error event to the ticket room
                      io.to(`ticket:${failedMessage.ticketId}`).emit('message:error', {
                        messageId: failedMessage.id,
                        wamid: status.id,
                        error: translatedError,
                        suggestion: suggestion,
                        originalError: errorMessage,
                      });
                      
                      // Also emit status update
                      io.to(`ticket:${failedMessage.ticketId}`).emit('message:status', {
                        messageId: failedMessage.id,
                        wamid: status.id,
                        status: 'FAILED',
                        translatedError,
                        suggestion,
                      });
                    }
                  }
                } else if (status.status === 'failed' && updateResult.count === 0) {
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

// Instagram webhook verification
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

    if (mode === 'subscribe' && token === connection.webhookToken) {
      logger.info(`Instagram webhook verified for connection ${connection.id}`);
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    logger.error('Instagram webhook verification error:', error);
    return res.sendStatus(500);
  }
});

/**
 * Extract message content from Instagram webhook message
 */
async function extractInstagramMessageContent(
  message: any,
  connection: any
): Promise<{
  type: string;
  content: string;
  mediaUrl?: string;
  quotedMessageId?: string;
  reactionEmoji?: string;
  reactionMessageId?: string;
  storyMention?: {
    id: string;
    url?: string;
  };
  storyReply?: {
    id: string;
    url?: string;
  };
}> {
  let type = 'TEXT';
  let content = '';
  let mediaUrl: string | undefined;
  let quotedMessageId: string | undefined;
  let reactionEmoji: string | undefined;
  let reactionMessageId: string | undefined;
  let storyMention: { id: string; url?: string } | undefined;
  let storyReply: { id: string; url?: string } | undefined;

  // Check if this is a reply
  if (message.reply_to?.mid) {
    quotedMessageId = message.reply_to.mid;
  }

  // Handle different message types
  if (message.text) {
    type = 'TEXT';
    content = message.text;
  } else if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];
    const attachmentType = attachment.type;
    const payload = attachment.payload;

    switch (attachmentType) {
      case 'image':
        type = 'IMAGE';
        mediaUrl = payload.url;
        break;
      case 'video':
        type = 'VIDEO';
        mediaUrl = payload.url;
        break;
      case 'audio':
        type = 'AUDIO';
        mediaUrl = payload.url;
        break;
      case 'file':
        type = 'DOCUMENT';
        mediaUrl = payload.url;
        break;
      case 'share':
        // Shared post or story
        type = 'TEXT';
        content = payload.url || '[Shared content]';
        break;
      case 'story_mention':
        // User mentioned our account in their story
        type = 'SYSTEM';
        content = '[Story mention]';
        storyMention = {
          id: payload.story_id,
          url: payload.url,
        };
        break;
      case 'reel':
        type = 'VIDEO';
        content = '[Reel shared]';
        mediaUrl = payload.url;
        break;
      case 'ig_reel':
        type = 'VIDEO';
        content = '[Instagram Reel]';
        mediaUrl = payload.url;
        break;
      default:
        type = 'TEXT';
        content = `[${attachmentType}]`;
    }
  } else if (message.sticker_id) {
    type = 'STICKER';
    content = message.sticker_id.toString();
  } else if (message.reaction) {
    // This is a reaction to a message
    reactionEmoji = message.reaction.emoji;
    reactionMessageId = message.reaction.mid;
  } else if (message.referral?.story) {
    // Reply to a story
    type = 'TEXT';
    content = message.text || '[Story reply]';
    storyReply = {
      id: message.referral.story.id,
      url: message.referral.story.url,
    };
  }

  // Download media if present
  if (mediaUrl && connection) {
    try {
      const instagramService = new InstagramService(connection);
      const { localPath } = await instagramService.downloadMedia(mediaUrl);
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
    } catch (error) {
      logger.error('Failed to download Instagram media:', error);
    }
  }

  return {
    type,
    content,
    mediaUrl,
    quotedMessageId,
    reactionEmoji,
    reactionMessageId,
    storyMention,
    storyReply,
  };
}

// Instagram webhook events
router.post('/instagram/:connectionId', async (req, res) => {
  try {
    // Always respond quickly to Meta
    res.sendStatus(200);

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.connectionId },
      include: { company: true },
    });

    if (!connection || connection.type !== 'INSTAGRAM') {
      logger.warn(`Instagram webhook for unknown/invalid connection: ${req.params.connectionId}`);
      return;
    }

    const body = req.body;
    logger.debug('Instagram webhook received:', JSON.stringify(body, null, 2));

    // Process webhook entries
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        // Process messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderId = event.sender?.id;
            const recipientId = event.recipient?.id;
            const timestamp = event.timestamp;

            // Skip if this is from our own account
            if (senderId === connection.instagramAccountId) {
              continue;
            }

            // Handle different event types
            if (event.message) {
              // Incoming message
              const extracted = await extractInstagramMessageContent(event.message, connection);

              // Handle reactions separately
              if (extracted.reactionEmoji !== undefined && extracted.reactionMessageId) {
                await handleInstagramReaction(
                  extracted.reactionMessageId,
                  extracted.reactionEmoji,
                  senderId,
                  false
                );
                continue;
              }

              // Process regular message
              await MessageProcessor.processIncoming({
                connectionId: connection.id,
                companyId: connection.companyId,
                from: senderId,
                wamid: event.message.mid,
                type: extracted.type,
                content: extracted.content,
                mediaUrl: extracted.mediaUrl,
                timestamp: new Date(timestamp),
                quotedMessageId: extracted.quotedMessageId,
                metadata: {
                  platform: 'instagram',
                  storyMention: extracted.storyMention,
                  storyReply: extracted.storyReply,
                } as any,
              });
            } else if (event.read) {
              // Message read receipt
              const watermark = event.read.watermark;
              logger.debug(`Instagram message read up to: ${watermark}`);
            } else if (event.reaction) {
              // Reaction to a message
              await handleInstagramReaction(
                event.reaction.mid,
                event.reaction.emoji || '',
                senderId,
                false
              );
            } else if (event.postback) {
              // Button postback
              const payload = event.postback.payload;
              const title = event.postback.title;

              await MessageProcessor.processIncoming({
                connectionId: connection.id,
                companyId: connection.companyId,
                from: senderId,
                wamid: event.postback.mid || `postback_${Date.now()}`,
                type: 'INTERACTIVE',
                content: title || payload,
                timestamp: new Date(timestamp),
                metadata: {
                  platform: 'instagram',
                  interactiveResponse: {
                    type: 'postback',
                    payload,
                    title,
                  } as any,
                } as any,
              });
            } else if (event.referral) {
              // User came from an ad, link, or other referral
              logger.info('Instagram referral event:', event.referral);
            }
          }
        }

        // Process standby events (when another app has control)
        if (entry.standby) {
          for (const event of entry.standby) {
            logger.debug('Instagram standby event:', event);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Instagram webhook processing error:', error);
  }
});

/**
 * Handle Instagram reaction to a message
 */
async function handleInstagramReaction(
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
      logger.warn(`Message not found for Instagram reaction: ${messageId}`);
      return;
    }

    // Store reaction
    if (emoji) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          reactions: {
            push: {
              emoji,
              from,
              fromMe,
              platform: 'instagram',
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    } else {
      // Remove reaction
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

    // Emit socket event
    const io = (global as any).io;
    if (io && message.ticket) {
      io.to(`ticket:${message.ticket.id}`).emit('message:reaction', {
        messageId: message.id,
        wamid: messageId,
        emoji,
        from,
        fromMe,
        platform: 'instagram',
      });
    }

    logger.info(`Instagram reaction ${emoji || '(removed)'} on message ${messageId}`);
  } catch (error) {
    logger.error('Error handling Instagram reaction:', error);
  }
}

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
