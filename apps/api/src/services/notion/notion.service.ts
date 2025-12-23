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

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  async testConnection(databaseId: string): Promise<boolean> {
    try {
      await this.client.databases.retrieve({ database_id: databaseId });
      return true;
    } catch (error) {
      logger.error('Notion connection test failed:', error);
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
}
