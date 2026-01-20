import { Client } from '@notionhq/client';
import { logger } from '../../config/logger.js';

interface NotionContact {
  pageId: string;
  name?: string;
  email?: string;
  phone?: string;
  isClient: boolean;
  isExClient: boolean;
  clientSince?: Date;
  metadata?: Record<string, any>;
}

export class NotionService {
  private client: Client;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Notion API Key is required');
    }
    this.apiKey = apiKey;
    this.client = new Client({ auth: apiKey });
  }

  async testConnection(databaseId?: string): Promise<boolean> {
    try {
      if (databaseId) {
        await this.client.databases.retrieve({ database_id: databaseId });
      } else {
        // Testa com uma busca simples de páginas
        await this.client.search({});
      }
      return true;
    } catch (error: any) {
      logger.error('Notion API connection test failed:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
      });
      return false;
    }
  }

  async findContact(
    databaseId: string,
    phone?: string | null,
    email?: string | null
  ): Promise<NotionContact | null> {
    try {
      if (!phone && !email) {
        return null;
      }

      const filters: any[] = [];

      if (phone) {
        // Try different phone formats
        const cleanPhone = phone.replace(/\D/g, '');
        filters.push({
          property: 'Telefone',
          phone_number: { contains: cleanPhone.slice(-9) }, // Last 9 digits
        });
      }

      if (email) {
        filters.push({
          property: 'Email',
          email: { equals: email },
        });
      }

      const response = await this.client.databases.query({
        database_id: databaseId,
        filter: filters.length === 1 ? filters[0] : { or: filters },
      });

      if (response.results.length === 0) {
        return null;
      }

      const page = response.results[0] as any;
      const properties = page.properties;

      return {
        pageId: page.id,
        name: this.extractText(properties.Nome || properties.Name),
        email: this.extractEmail(properties.Email),
        phone: this.extractPhone(properties.Telefone || properties.Phone),
        isClient: this.checkStatus(properties.Status, ['cliente', 'ativo', 'active']),
        isExClient: this.checkStatus(properties.Status, ['ex-cliente', 'inativo', 'churned']),
        clientSince: this.extractDate(properties['Data de Início'] || properties['Start Date']),
        metadata: this.extractMetadata(properties),
      };
    } catch (error) {
      logger.error('Notion search error:', error);
      return null;
    }
  }

  async createContact(
    databaseId: string,
    data: {
      name?: string;
      email?: string;
      phone: string;
    }
  ): Promise<string | null> {
    try {
      const properties: any = {
        Telefone: {
          phone_number: data.phone,
        },
      };

      if (data.name) {
        properties.Nome = {
          title: [{ text: { content: data.name } }],
        };
      }

      if (data.email) {
        properties.Email = {
          email: data.email,
        };
      }

      properties.Status = {
        select: { name: 'Novo' },
      };

      const response = await this.client.pages.create({
        parent: { database_id: databaseId },
        properties,
      });

      return response.id;
    } catch (error) {
      logger.error('Notion create contact error:', error);
      return null;
    }
  }

  async updateContact(
    pageId: string,
    data: {
      name?: string;
      email?: string;
      status?: string;
    }
  ): Promise<boolean> {
    try {
      const properties: any = {};

      if (data.name) {
        properties.Nome = {
          title: [{ text: { content: data.name } }],
        };
      }

      if (data.email) {
        properties.Email = {
          email: data.email,
        };
      }

      if (data.status) {
        properties.Status = {
          select: { name: data.status },
        };
      }

      await this.client.pages.update({
        page_id: pageId,
        properties,
      });

      return true;
    } catch (error) {
      logger.error('Notion update contact error:', error);
      return false;
    }
  }

  async addNote(
    pageId: string,
    note: string
  ): Promise<boolean> {
    try {
      await this.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: `[${new Date().toISOString()}] ${note}` },
                },
              ],
            },
          },
        ],
      });

      return true;
    } catch (error) {
      logger.error('Notion add note error:', error);
      return false;
    }
  }

  private extractText(property: any): string | undefined {
    if (!property) return undefined;

    if (property.type === 'title') {
      return property.title?.[0]?.plain_text;
    }

    if (property.type === 'rich_text') {
      return property.rich_text?.[0]?.plain_text;
    }

    return undefined;
  }

  private extractEmail(property: any): string | undefined {
    if (!property || property.type !== 'email') return undefined;
    return property.email || undefined;
  }

  private extractPhone(property: any): string | undefined {
    if (!property || property.type !== 'phone_number') return undefined;
    return property.phone_number || undefined;
  }

  private extractDate(property: any): Date | undefined {
    if (!property || property.type !== 'date') return undefined;
    return property.date?.start ? new Date(property.date.start) : undefined;
  }

  private checkStatus(property: any, matchValues: string[]): boolean {
    if (!property) return false;

    let value = '';

    if (property.type === 'select') {
      value = property.select?.name?.toLowerCase() || '';
    } else if (property.type === 'status') {
      value = property.status?.name?.toLowerCase() || '';
    }

    return matchValues.some((v) => value.includes(v.toLowerCase()));
  }

  private extractMetadata(properties: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any;

      switch (prop.type) {
        case 'number':
          metadata[key] = prop.number;
          break;
        case 'select':
          metadata[key] = prop.select?.name;
          break;
        case 'multi_select':
          metadata[key] = prop.multi_select?.map((s: any) => s.name);
          break;
        case 'date':
          metadata[key] = prop.date?.start;
          break;
        case 'checkbox':
          metadata[key] = prop.checkbox;
          break;
        case 'url':
          metadata[key] = prop.url;
          break;
      }
    }

    return metadata;
  }

  /**
   * Lê o conteúdo completo de uma página do Notion via API
   * @param pageUrl - URL completa da página do Notion ou Page ID
   * @returns Conteúdo formatado da página
   */
  async readPageContent(pageUrl: string): Promise<string | null> {
    try {
      // Extrair Page ID da URL
      let pageId = this.extractPageIdFromUrl(pageUrl);
      
      if (!pageId) {
        logger.error('Invalid Notion page URL format:', pageUrl);
        return null;
      }

      // Converter para formato UUID se necessário
      pageId = this.formatPageId(pageId);

      // Buscar página via API
      const page = await this.client.pages.retrieve({ page_id: pageId });
      
      // Buscar todos os blocos da página
      const blocks = await this.retrieveAllBlocks(pageId);
      
      // Extrair e formatar conteúdo
      const content = this.extractContentFromBlocks(blocks, page);
      
      return content;
    } catch (error: any) {
      logger.error('Error reading Notion page via API:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        pageUrl,
      });
      
      // Tratar erros específicos da API
      if (error?.code === 'object_not_found') {
        logger.warn('Notion page not found or not accessible:', pageUrl);
      } else if (error?.code === 'unauthorized') {
        logger.error('Notion API key is invalid or expired');
      } else if (error?.status === 429) {
        logger.warn('Notion API rate limit exceeded, retrying...');
        // Implementar retry com backoff exponencial
        await this.delay(1000);
        return this.readPageContent(pageUrl);
      }
      
      return null;
    }
  }

  /**
   * Busca todas as páginas de um database via API
   */
  async readDatabasePages(databaseId: string): Promise<any[]> {
    try {
      const pages: any[] = [];
      let cursor: string | undefined = undefined;

      do {
        const response = await this.client.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
          page_size: 100, // Máximo permitido pela API
        });

        pages.push(...response.results);
        cursor = response.next_cursor || undefined;
      } while (cursor);

      return pages;
    } catch (error: any) {
      logger.error('Error reading Notion database via API:', {
        message: error?.message,
        code: error?.code,
        databaseId,
      });
      return [];
    }
  }

  /**
   * Busca recursivamente todos os blocos de uma página
   */
  private async retrieveAllBlocks(pageId: string): Promise<any[]> {
    const allBlocks: any[] = [];
    let cursor: string | undefined = undefined;

    do {
      try {
        const response = await this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100, // Máximo permitido pela API
        });

        for (const block of response.results) {
          allBlocks.push(block);

          // Se o bloco tem filhos (ex: toggle, nested lists), buscar recursivamente
          if ((block as any).has_children) {
            const childBlocks = await this.retrieveAllBlocks(block.id);
            allBlocks.push(...childBlocks);
          }
        }

        cursor = response.next_cursor || undefined;
      } catch (error: any) {
        // Tratar rate limit
        if (error?.status === 429) {
          logger.warn('Rate limit ao buscar blocos, aguardando...');
          await this.delay(2000);
          continue;
        }
        throw error;
      }
    } while (cursor);

    return allBlocks;
  }

  /**
   * Extrai e formata conteúdo dos blocos
   */
  private extractContentFromBlocks(blocks: any[], page: any): string {
    const sections: string[] = [];

    // Adicionar título da página se disponível
    if (page.properties) {
      const titleProperty = Object.values(page.properties).find(
        (prop: any) => prop?.type === 'title'
      ) as any;
      if (titleProperty?.title) {
        const title = this.extractRichText(titleProperty.title);
        if (title) {
          sections.push(`# ${title}\n`);
        }
      }
    }

    // Processar cada bloco
    for (const block of blocks) {
      const content = this.extractBlockContent(block);
      if (content) {
        sections.push(content);
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Extrai conteúdo de um bloco específico
   */
  private extractBlockContent(block: any): string | null {
    const blockType = block.type;
    const blockData = block[blockType];

    if (!blockData) return null;

    switch (blockType) {
      case 'paragraph':
        return this.extractRichText(blockData.rich_text);
      
      case 'heading_1':
        return `# ${this.extractRichText(blockData.rich_text)}`;
      
      case 'heading_2':
        return `## ${this.extractRichText(blockData.rich_text)}`;
      
      case 'heading_3':
        return `### ${this.extractRichText(blockData.rich_text)}`;
      
      case 'bulleted_list_item':
        return `- ${this.extractRichText(blockData.rich_text)}`;
      
      case 'numbered_list_item':
        return `1. ${this.extractRichText(blockData.rich_text)}`;
      
      case 'to_do':
        const checked = blockData.checked ? '✅' : '☐';
        return `${checked} ${this.extractRichText(blockData.rich_text)}`;
      
      case 'toggle':
        return `▶ ${this.extractRichText(blockData.rich_text)}`;
      
      case 'quote':
        return `> ${this.extractRichText(blockData.rich_text)}`;
      
      case 'code':
        const language = blockData.language || '';
        const code = this.extractRichText(blockData.rich_text);
        return `\`\`\`${language}\n${code}\n\`\`\``;
      
      case 'callout':
        const emoji = blockData.icon?.emoji || '💡';
        return `${emoji} ${this.extractRichText(blockData.rich_text)}`;
      
      case 'table':
        // Processar tabela (simplificado)
        return this.extractTable(block);
      
      case 'divider':
        return '---';
      
      default:
        // Para outros tipos, tentar extrair rich_text
        if (blockData.rich_text) {
          return this.extractRichText(blockData.rich_text);
        }
        return null;
    }
  }

  /**
   * Extrai texto de rich_text array
   */
  private extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    
    return richText
      .map((item: any) => {
        if (item.type === 'text') {
          return item.plain_text;
        } else if (item.type === 'mention') {
          // Tratar menções
          return item.plain_text || '';
        } else if (item.type === 'equation') {
          return item.plain_text || '';
        }
        return '';
      })
      .join('');
  }

  /**
   * Extrai tabela (simplificado)
   */
  private extractTable(block: any): string {
    // Implementação simplificada
    // Para tabelas complexas, seria necessário buscar células individualmente
    return '[Tabela - conteúdo não extraído automaticamente]';
  }

  /**
   * Extrai Page ID de uma URL do Notion
   */
  private extractPageIdFromUrl(url: string): string | null {
    // Formato 1: https://grupoblue.notion.site/Tokeniza-Private-1b32e840ab4f80fdbb0ddd9c9c340a7e
    const urlMatch = url.match(/([a-f0-9]{32})/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Formato 2: ID direto (32 caracteres hex)
    if (/^[a-f0-9]{32}$/i.test(url)) {
      return url;
    }

    // Formato 3: UUID formatado
    const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
      return uuidMatch[1].replace(/-/g, '');
    }

    return null;
  }

  /**
   * Formata Page ID para UUID (com hífens)
   */
  private formatPageId(pageId: string): string {
    // Se já está no formato UUID, retornar
    if (pageId.includes('-')) {
      return pageId;
    }

    // Converter de 32 caracteres para UUID
    if (pageId.length === 32) {
      return `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
    }

    return pageId;
  }

  /**
   * Delay helper para rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
