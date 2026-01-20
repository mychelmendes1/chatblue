import { Client } from '@notionhq/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { EmbeddingService } from './embedding.service.js';
import crypto from 'crypto';

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  titleProperty?: string;
  contentProperty?: string;
  categoryProperty?: string;
  tagsProperty?: string;
  filters?: {
    status?: string[];
  };
}

export interface GoogleDriveConfig {
  credentials: {
    client_id: string;
    client_secret: string;
    refresh_token: string;
  };
  folderId: string;
  mimeTypes?: string[];
}

export interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  spaceKey: string;
  labels?: string[];
}

export interface SyncResult {
  success: boolean;
  documentsAdded: number;
  documentsUpdated: number;
  documentsRemoved: number;
  errors: string[];
}

export class DataSourceSyncService {
  private embeddingService: EmbeddingService | null = null;

  constructor(embeddingProvider?: string, embeddingApiKey?: string) {
    if (embeddingProvider && embeddingApiKey) {
      this.embeddingService = new EmbeddingService(embeddingProvider, embeddingApiKey);
    }
  }

  /**
   * Sync a data source based on its type
   */
  async syncDataSource(dataSourceId: string): Promise<SyncResult> {
    const dataSource = await prisma.aIDataSource.findUnique({
      where: { id: dataSourceId },
      include: {
        company: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!dataSource) {
      throw new Error('Data source not found');
    }

    if (!dataSource.isActive) {
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: ['Data source is not active'],
      };
    }

    // Initialize embedding service if not already done
    if (!this.embeddingService && dataSource.company.settings?.aiApiKey) {
      this.embeddingService = new EmbeddingService(
        dataSource.company.settings.aiProvider || 'openai',
        dataSource.company.settings.aiApiKey
      );
    }

    try {
      let result: SyncResult;

      switch (dataSource.type) {
        case 'NOTION':
          result = await this.syncNotion(dataSource);
          break;
        case 'GOOGLE_DRIVE':
          result = await this.syncGoogleDrive(dataSource);
          break;
        case 'CONFLUENCE':
          result = await this.syncConfluence(dataSource);
          break;
        case 'INTERNAL':
          result = await this.syncInternal(dataSource);
          break;
        case 'WEBSITE':
          result = await this.syncWebsite(dataSource);
          break;
        default:
          result = {
            success: false,
            documentsAdded: 0,
            documentsUpdated: 0,
            documentsRemoved: 0,
            errors: [`Unsupported data source type: ${dataSource.type}`],
          };
      }

      // Update last sync time
      await prisma.aIDataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
        },
      });

      return result;
    } catch (error: any) {
      logger.error('Data source sync failed', {
        dataSourceId,
        type: dataSource.type,
        error: error.message,
      });

      await prisma.aIDataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncError: error.message,
        },
      });

      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Sync Notion database
   */
  private async syncNotion(dataSource: any): Promise<SyncResult> {
    const config = dataSource.config as NotionConfig;

    if (!config.apiKey || !config.databaseId) {
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: ['Missing Notion API key or database ID'],
      };
    }

    const notion = new Client({ auth: config.apiKey });
    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsRemoved: 0,
      errors: [],
    };

    try {
      // Query all pages from the database
      const response = await notion.databases.query({
        database_id: config.databaseId,
      });

      const existingDocs = await prisma.aIDocument.findMany({
        where: { dataSourceId: dataSource.id },
        select: { id: true, externalId: true, checksum: true },
      });

      const existingMap = new Map(existingDocs.map(d => [d.externalId, d]));
      const processedIds = new Set<string>();

      for (const page of response.results) {
        if (!('properties' in page)) continue;

        try {
          const pageId = page.id;
          processedIds.add(pageId);

          // Extract title
          const titleProp = config.titleProperty || 'Name';
          const title = this.extractNotionTitle(page.properties, titleProp);

          // Get page content (blocks)
          const content = await this.getNotionPageContent(notion, pageId);

          // Extract category and tags
          const category = config.categoryProperty
            ? this.extractNotionProperty(page.properties, config.categoryProperty)
            : dataSource.category;
          const tags = config.tagsProperty
            ? this.extractNotionTags(page.properties, config.tagsProperty)
            : [];

          // Calculate checksum
          const checksum = crypto.createHash('md5').update(content).digest('hex');

          const existing = existingMap.get(pageId);

          if (existing) {
            // Check if content changed
            if (existing.checksum !== checksum) {
              await prisma.aIDocument.update({
                where: { id: existing.id },
                data: {
                  title,
                  content,
                  checksum,
                  category,
                  tags,
                  status: 'PENDING', // Re-index needed
                  externalUrl: `https://notion.so/${pageId.replace(/-/g, '')}`,
                },
              });
              result.documentsUpdated++;
            }
          } else {
            // Create new document
            await prisma.aIDocument.create({
              data: {
                title,
                content,
                checksum,
                category,
                tags,
                externalId: pageId,
                externalUrl: `https://notion.so/${pageId.replace(/-/g, '')}`,
                dataSourceId: dataSource.id,
                companyId: dataSource.companyId,
                status: 'PENDING',
              },
            });
            result.documentsAdded++;
          }
        } catch (pageError: any) {
          result.errors.push(`Page ${page.id}: ${pageError.message}`);
        }
      }

      // Remove documents that no longer exist in Notion
      for (const [externalId, doc] of existingMap) {
        if (externalId && !processedIds.has(externalId)) {
          await prisma.aIDocument.update({
            where: { id: doc.id },
            data: { isActive: false },
          });
          result.documentsRemoved++;
        }
      }

      // Index new/updated documents
      await this.indexPendingDocuments(dataSource.id);

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Sync Google Drive folder
   */
  private async syncGoogleDrive(dataSource: any): Promise<SyncResult> {
    const config = dataSource.config as GoogleDriveConfig;

    if (!config.credentials || !config.folderId) {
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: ['Missing Google Drive credentials or folder ID'],
      };
    }

    // Note: Full Google Drive implementation requires google-auth-library and googleapis
    // This is a placeholder that shows the structure

    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsRemoved: 0,
      errors: [],
    };

    try {
      // Import Google APIs dynamically
      // @ts-ignore - googleapis may not be installed
      const { google } = await import('googleapis').catch(() => {
        throw new Error('googleapis module not installed. Run: npm install googleapis');
      });

      const oauth2Client = new google.auth.OAuth2(
        config.credentials.client_id,
        config.credentials.client_secret
      );

      oauth2Client.setCredentials({
        refresh_token: config.credentials.refresh_token,
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // List files in folder
      const mimeTypes = config.mimeTypes || [
        'application/vnd.google-apps.document',
        'application/pdf',
        'text/plain',
        'text/markdown',
      ];

      const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');

      const filesResponse = await drive.files.list({
        q: `'${config.folderId}' in parents and (${mimeQuery}) and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
        pageSize: 100,
      });

      const files = filesResponse.data.files || [];

      const existingDocs = await prisma.aIDocument.findMany({
        where: { dataSourceId: dataSource.id },
        select: { id: true, externalId: true, checksum: true },
      });

      const existingMap = new Map(existingDocs.map(d => [d.externalId, d]));
      const processedIds = new Set<string>();

      for (const file of files) {
        if (!file.id) continue;
        processedIds.add(file.id);

        try {
          // Get file content
          let content = '';

          if (file.mimeType === 'application/vnd.google-apps.document') {
            // Export Google Doc as plain text
            const exportResponse = await drive.files.export({
              fileId: file.id,
              mimeType: 'text/plain',
            });
            content = exportResponse.data as string;
          } else if (file.mimeType === 'text/plain' || file.mimeType === 'text/markdown') {
            // Download text file
            const downloadResponse = await drive.files.get({
              fileId: file.id,
              alt: 'media',
            });
            content = downloadResponse.data as string;
          } else {
            // Skip unsupported formats for now
            continue;
          }

          const checksum = crypto.createHash('md5').update(content).digest('hex');
          const existing = existingMap.get(file.id);

          if (existing) {
            if (existing.checksum !== checksum) {
              await prisma.aIDocument.update({
                where: { id: existing.id },
                data: {
                  title: file.name || 'Untitled',
                  content,
                  checksum,
                  status: 'PENDING',
                  externalUrl: file.webViewLink || undefined,
                },
              });
              result.documentsUpdated++;
            }
          } else {
            await prisma.aIDocument.create({
              data: {
                title: file.name || 'Untitled',
                content,
                checksum,
                category: dataSource.category,
                externalId: file.id,
                externalUrl: file.webViewLink || undefined,
                dataSourceId: dataSource.id,
                companyId: dataSource.companyId,
                status: 'PENDING',
              },
            });
            result.documentsAdded++;
          }
        } catch (fileError: any) {
          result.errors.push(`File ${file.id}: ${fileError.message}`);
        }
      }

      // Mark removed files as inactive
      for (const [externalId, doc] of existingMap) {
        if (externalId && !processedIds.has(externalId)) {
          await prisma.aIDocument.update({
            where: { id: doc.id },
            data: { isActive: false },
          });
          result.documentsRemoved++;
        }
      }

      // Index pending documents
      await this.indexPendingDocuments(dataSource.id);

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Sync Confluence space
   */
  private async syncConfluence(dataSource: any): Promise<SyncResult> {
    const config = dataSource.config as ConfluenceConfig;

    if (!config.baseUrl || !config.username || !config.apiToken || !config.spaceKey) {
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: ['Missing Confluence configuration'],
      };
    }

    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsRemoved: 0,
      errors: [],
    };

    try {
      const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');

      // Fetch pages from Confluence space
      const searchUrl = `${config.baseUrl}/rest/api/content?spaceKey=${config.spaceKey}&type=page&expand=body.storage,version&limit=100`;

      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Confluence API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const pages = data.results || [];

      const existingDocs = await prisma.aIDocument.findMany({
        where: { dataSourceId: dataSource.id },
        select: { id: true, externalId: true, checksum: true },
      });

      const existingMap = new Map(existingDocs.map(d => [d.externalId, d]));
      const processedIds = new Set<string>();

      for (const page of pages) {
        processedIds.add(page.id);

        try {
          // Extract content (remove HTML tags for simplicity)
          const htmlContent = page.body?.storage?.value || '';
          const textContent = this.stripHtml(htmlContent);

          const checksum = crypto.createHash('md5').update(textContent).digest('hex');
          const existing = existingMap.get(page.id);

          const pageUrl = `${config.baseUrl}/wiki/spaces/${config.spaceKey}/pages/${page.id}`;

          if (existing) {
            if (existing.checksum !== checksum) {
              await prisma.aIDocument.update({
                where: { id: existing.id },
                data: {
                  title: page.title,
                  content: textContent,
                  checksum,
                  status: 'PENDING',
                  externalUrl: pageUrl,
                },
              });
              result.documentsUpdated++;
            }
          } else {
            await prisma.aIDocument.create({
              data: {
                title: page.title,
                content: textContent,
                checksum,
                category: dataSource.category,
                externalId: page.id,
                externalUrl: pageUrl,
                dataSourceId: dataSource.id,
                companyId: dataSource.companyId,
                status: 'PENDING',
              },
            });
            result.documentsAdded++;
          }
        } catch (pageError: any) {
          result.errors.push(`Page ${page.id}: ${pageError.message}`);
        }
      }

      // Mark removed pages as inactive
      for (const [externalId, doc] of existingMap) {
        if (externalId && !processedIds.has(externalId)) {
          await prisma.aIDocument.update({
            where: { id: doc.id },
            data: { isActive: false },
          });
          result.documentsRemoved++;
        }
      }

      // Index pending documents
      await this.indexPendingDocuments(dataSource.id);

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Sync internal documents (FAQ and Knowledge Base)
   */
  private async syncInternal(dataSource: any): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsRemoved: 0,
      errors: [],
    };

    try {
      // Get existing documents
      const existingDocs = await prisma.aIDocument.findMany({
        where: { dataSourceId: dataSource.id },
        select: { id: true, externalId: true, checksum: true },
      });

      const existingMap = new Map(existingDocs.map(d => [d.externalId, d]));
      const processedIds = new Set<string>();

      // Sync FAQ
      const faqs = await prisma.fAQ.findMany({
        where: { companyId: dataSource.companyId, isActive: true },
      });

      for (const faq of faqs) {
        const externalId = `faq-${faq.id}`;
        processedIds.add(externalId);

        const content = `Pergunta: ${faq.question}\n\nResposta: ${faq.answer}`;
        const checksum = crypto.createHash('md5').update(content).digest('hex');

        const existing = existingMap.get(externalId);

        if (existing) {
          if (existing.checksum !== checksum) {
            await prisma.aIDocument.update({
              where: { id: existing.id },
              data: {
                title: faq.question,
                content,
                checksum,
                tags: faq.keywords,
                category: faq.category || 'faq',
                status: 'PENDING',
              },
            });
            result.documentsUpdated++;
          }
        } else {
          await prisma.aIDocument.create({
            data: {
              title: faq.question,
              content,
              checksum,
              tags: faq.keywords,
              category: faq.category || 'faq',
              externalId,
              dataSourceId: dataSource.id,
              companyId: dataSource.companyId,
              departmentId: faq.departmentId,
              status: 'PENDING',
            },
          });
          result.documentsAdded++;
        }
      }

      // Sync Knowledge Base
      const articles = await prisma.knowledgeBase.findMany({
        where: { companyId: dataSource.companyId, isActive: true },
      });

      for (const article of articles) {
        const externalId = `kb-${article.id}`;
        processedIds.add(externalId);

        const checksum = crypto.createHash('md5').update(article.content).digest('hex');
        const existing = existingMap.get(externalId);

        if (existing) {
          if (existing.checksum !== checksum) {
            await prisma.aIDocument.update({
              where: { id: existing.id },
              data: {
                title: article.title,
                content: article.content,
                checksum,
                tags: article.tags,
                category: article.category || 'knowledge-base',
                status: 'PENDING',
              },
            });
            result.documentsUpdated++;
          }
        } else {
          await prisma.aIDocument.create({
            data: {
              title: article.title,
              content: article.content,
              checksum,
              tags: article.tags,
              category: article.category || 'knowledge-base',
              externalId,
              dataSourceId: dataSource.id,
              companyId: dataSource.companyId,
              departmentId: article.departmentId,
              status: 'PENDING',
            },
          });
          result.documentsAdded++;
        }
      }

      // Mark removed items as inactive
      for (const [externalId, doc] of existingMap) {
        if (externalId && !processedIds.has(externalId)) {
          await prisma.aIDocument.update({
            where: { id: doc.id },
            data: { isActive: false },
          });
          result.documentsRemoved++;
        }
      }

      // Index pending documents
      await this.indexPendingDocuments(dataSource.id);

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Sync website (basic web scraping)
   */
  private async syncWebsite(dataSource: any): Promise<SyncResult> {
    const config = dataSource.config as { urls: string[]; selector?: string };

    if (!config.urls?.length) {
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsRemoved: 0,
        errors: ['No URLs configured'],
      };
    }

    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsRemoved: 0,
      errors: [],
    };

    // Basic implementation - fetch and extract text from URLs
    for (const url of config.urls) {
      try {
        const response = await fetch(url);
        const html = await response.text();

        // Extract title from HTML
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : url;

        // Strip HTML to get text content
        const content = this.stripHtml(html);

        const checksum = crypto.createHash('md5').update(content).digest('hex');

        const existing = await prisma.aIDocument.findFirst({
          where: { dataSourceId: dataSource.id, externalUrl: url },
        });

        if (existing) {
          if (existing.checksum !== checksum) {
            await prisma.aIDocument.update({
              where: { id: existing.id },
              data: { title, content, checksum, status: 'PENDING' },
            });
            result.documentsUpdated++;
          }
        } else {
          await prisma.aIDocument.create({
            data: {
              title,
              content,
              checksum,
              category: dataSource.category,
              externalUrl: url,
              dataSourceId: dataSource.id,
              companyId: dataSource.companyId,
              status: 'PENDING',
            },
          });
          result.documentsAdded++;
        }
      } catch (urlError: any) {
        result.errors.push(`URL ${url}: ${urlError.message}`);
      }
    }

    // Index pending documents
    await this.indexPendingDocuments(dataSource.id);

    return result;
  }

  /**
   * Index all pending documents for a data source
   */
  private async indexPendingDocuments(dataSourceId: string): Promise<void> {
    if (!this.embeddingService) {
      logger.warn('Embedding service not configured, skipping indexing');
      return;
    }

    const pendingDocs = await prisma.aIDocument.findMany({
      where: {
        dataSourceId,
        status: 'PENDING',
        isActive: true,
      },
      select: { id: true },
    });

    for (const doc of pendingDocs) {
      try {
        await this.embeddingService.indexDocument(doc.id);
      } catch (error: any) {
        logger.error('Failed to index document', {
          documentId: doc.id,
          error: error.message,
        });
      }
    }
  }

  // Helper methods

  private extractNotionTitle(properties: any, propertyName: string): string {
    const prop = properties[propertyName];
    if (!prop) return 'Untitled';

    if (prop.type === 'title' && prop.title?.length) {
      return prop.title.map((t: any) => t.plain_text).join('');
    }

    return 'Untitled';
  }

  private extractNotionProperty(properties: any, propertyName: string): string | undefined {
    const prop = properties[propertyName];
    if (!prop) return undefined;

    switch (prop.type) {
      case 'select':
        return prop.select?.name;
      case 'rich_text':
        return prop.rich_text?.map((t: any) => t.plain_text).join('');
      case 'title':
        return prop.title?.map((t: any) => t.plain_text).join('');
      default:
        return undefined;
    }
  }

  private extractNotionTags(properties: any, propertyName: string): string[] {
    const prop = properties[propertyName];
    if (!prop) return [];

    if (prop.type === 'multi_select') {
      return prop.multi_select?.map((s: any) => s.name) || [];
    }

    return [];
  }

  private async getNotionPageContent(notion: Client, pageId: string): Promise<string> {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    const contentParts: string[] = [];

    for (const block of blocks.results) {
      if (!('type' in block)) continue;

      const text = this.extractNotionBlockText(block);
      if (text) {
        contentParts.push(text);
      }
    }

    return contentParts.join('\n\n');
  }

  private extractNotionBlockText(block: any): string {
    const richTextTypes = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'quote', 'callout'];

    if (richTextTypes.includes(block.type)) {
      const richText = block[block.type]?.rich_text || [];
      return richText.map((t: any) => t.plain_text).join('');
    }

    if (block.type === 'code') {
      const code = block.code?.rich_text?.map((t: any) => t.plain_text).join('') || '';
      return `\`\`\`\n${code}\n\`\`\``;
    }

    return '';
  }

  private stripHtml(html: string): string {
    // Remove script and style tags completely
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Replace common block elements with newlines
    text = text.replace(/<(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\n\s*\n/g, '\n\n');
    text = text.trim();

    return text;
  }
}

// Export singleton factory
export function createDataSourceSyncService(
  provider?: string,
  apiKey?: string
): DataSourceSyncService {
  return new DataSourceSyncService(provider, apiKey);
}
