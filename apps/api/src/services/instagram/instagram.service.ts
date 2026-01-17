import { WhatsAppConnection } from '@prisma/client';
import { logger } from '../../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const META_API_URL = 'https://graph.facebook.com/v18.0';

// Get the uploads directory path
const getUploadsDir = () => {
  const possiblePaths = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'apps', 'api', 'uploads'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Create default path if none exists
  const defaultPath = possiblePaths[0];
  fs.mkdirSync(defaultPath, { recursive: true });
  return defaultPath;
};

export class InstagramService {
  private connection: WhatsAppConnection;

  constructor(connection: WhatsAppConnection) {
    this.connection = connection;
  }

  /**
   * Test connection to Instagram API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.instagramAccountId}?fields=id,username,name`,
        {
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Instagram connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Instagram account info
   */
  async getAccountInfo(): Promise<{
    id: string;
    username: string;
    name: string;
    profilePictureUrl?: string;
  } | null> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.instagramAccountId}?fields=id,username,name,profile_picture_url`,
        {
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profile_picture_url,
      };
    } catch (error) {
      logger.error('Failed to get Instagram account info:', error);
      return null;
    }
  }

  /**
   * Send a text message via Instagram DM
   */
  async sendTextMessage(
    recipientId: string,
    content: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: content,
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send message failed:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send an image message via Instagram DM
   */
  async sendImageMessage(
    recipientId: string,
    imageUrl: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: imageUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send image failed:', data);
      throw new Error(data.error?.message || 'Failed to send image');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a video message via Instagram DM
   */
  async sendVideoMessage(
    recipientId: string,
    videoUrl: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'video',
              payload: {
                url: videoUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send video failed:', data);
      throw new Error(data.error?.message || 'Failed to send video');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send an audio message via Instagram DM
   */
  async sendAudioMessage(
    recipientId: string,
    audioUrl: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'audio',
              payload: {
                url: audioUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send audio failed:', data);
      throw new Error(data.error?.message || 'Failed to send audio');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a file/document message via Instagram DM
   */
  async sendFileMessage(
    recipientId: string,
    fileUrl: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'file',
              payload: {
                url: fileUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send file failed:', data);
      throw new Error(data.error?.message || 'Failed to send file');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a media message (routes to appropriate method based on type)
   */
  async sendMediaMessage(
    recipientId: string,
    mediaUrl: string,
    mediaType: string
  ): Promise<{ messageId: string }> {
    switch (mediaType.toUpperCase()) {
      case 'IMAGE':
        return this.sendImageMessage(recipientId, mediaUrl);
      case 'VIDEO':
        return this.sendVideoMessage(recipientId, mediaUrl);
      case 'AUDIO':
        return this.sendAudioMessage(recipientId, mediaUrl);
      case 'DOCUMENT':
      default:
        return this.sendFileMessage(recipientId, mediaUrl);
    }
  }

  /**
   * Send a sticker via Instagram DM
   */
  async sendSticker(
    recipientId: string,
    stickerId: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'like_heart', // Instagram heart sticker
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send sticker failed:', data);
      throw new Error(data.error?.message || 'Failed to send sticker');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a heart/like reaction
   */
  async sendHeartReaction(
    recipientId: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'like_heart',
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send heart failed:', data);
      throw new Error(data.error?.message || 'Failed to send heart');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    recipientId: string,
    messageId: string,
    emoji: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          sender_action: 'react',
          payload: {
            message_id: messageId,
            reaction: emoji || 'love', // Default to love reaction
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send reaction failed:', data);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    recipientId: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          sender_action: 'unreact',
          payload: {
            message_id: messageId,
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram remove reaction failed:', data);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Get user profile from Instagram
   */
  async getUserProfile(userId: string): Promise<{
    id: string;
    username?: string;
    name?: string;
    profilePic?: string;
  } | null> {
    try {
      const response = await fetch(
        `${META_API_URL}/${userId}?fields=id,username,name,profile_pic`,
        {
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        profilePic: data.profile_pic,
      };
    } catch (error) {
      logger.error('Failed to get Instagram user profile:', error);
      return null;
    }
  }

  /**
   * Download media from Instagram
   */
  async downloadMedia(
    mediaUrl: string,
    filename?: string
  ): Promise<{ localPath: string; mimeType: string }> {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Determine file extension from mime type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
    };

    const extension = extensionMap[contentType] || 'bin';
    const finalFilename = filename || `instagram_${Date.now()}.${extension}`;

    // Save to uploads directory
    const uploadsDir = getUploadsDir();
    const mediaDir = path.join(uploadsDir, 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const localPath = path.join(mediaDir, finalFilename);

    // Get buffer and save
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buffer);

    logger.info(`Instagram media downloaded: ${localPath}`);

    return { localPath, mimeType: contentType };
  }

  /**
   * Mark a message as seen
   */
  async markAsSeen(senderId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: {
              id: senderId,
            },
            sender_action: 'mark_seen',
          }),
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Instagram mark as seen failed:', error);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(recipientId: string, isTyping: boolean): Promise<boolean> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: {
              id: recipientId,
            },
            sender_action: isTyping ? 'typing_on' : 'typing_off',
          }),
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Instagram typing indicator failed:', error);
      return false;
    }
  }

  /**
   * Send an Ice Breaker message (predefined quick replies for conversation starters)
   */
  async sendIceBreaker(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text,
            quick_replies: quickReplies.slice(0, 13).map((qr) => ({
              content_type: 'text',
              title: qr.title.slice(0, 20),
              payload: qr.payload,
            })),
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send ice breaker failed:', data);
      throw new Error(data.error?.message || 'Failed to send ice breaker');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a generic template (carousel)
   */
  async sendGenericTemplate(
    recipientId: string,
    elements: Array<{
      title: string;
      subtitle?: string;
      imageUrl?: string;
      defaultAction?: { type: string; url: string };
      buttons?: Array<{ type: string; title: string; url?: string; payload?: string }>;
    }>
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: elements.slice(0, 10).map((el) => ({
                  title: el.title,
                  subtitle: el.subtitle,
                  image_url: el.imageUrl,
                  default_action: el.defaultAction
                    ? {
                        type: el.defaultAction.type,
                        url: el.defaultAction.url,
                      }
                    : undefined,
                  buttons: el.buttons?.slice(0, 3).map((btn) => ({
                    type: btn.type,
                    title: btn.title,
                    url: btn.url,
                    payload: btn.payload,
                  })),
                })),
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send generic template failed:', data);
      throw new Error(data.error?.message || 'Failed to send template');
    }

    return { messageId: data.message_id || '' };
  }

  /**
   * Send a product template
   */
  async sendProductTemplate(
    recipientId: string,
    productId: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.instagramAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'product',
                product_id: productId,
              },
            },
          },
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      logger.error('Instagram send product template failed:', data);
      throw new Error(data.error?.message || 'Failed to send product');
    }

    return { messageId: data.message_id || '' };
  }
}
