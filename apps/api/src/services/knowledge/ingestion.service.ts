import { logger } from '../../config/logger.js';
import { NotionService } from '../notion/notion.service.js';
import * as fs from 'fs';
import * as path from 'path';
// pdf-parse: lazy-loaded to avoid crash in Docker (browser/canvas polyfills)
// @ts-ignore - mammoth types issue
import * as mammoth from 'mammoth';

export interface ProcessedSource {
  content: string;
  metadata: Record<string, any>;
}

export class KnowledgeIngestionService {
  /**
   * Processa uma fonte de conhecimento baseado no tipo
   */
  async processSource(
    source: any,
    notionService?: NotionService
  ): Promise<ProcessedSource> {
    switch (source.type) {
      case 'TEXT':
        return this.processTextSource(source);

      case 'PDF':
        return this.processPDFSource(source);

      case 'NOTION':
        if (!notionService) {
          throw new Error(
            'NotionService required for NOTION sources. API Key must be configured.'
          );
        }
        return this.processNotionSource(source, notionService);

      case 'URL':
        return this.processURLSource(source);

      case 'DOCX':
        return this.processDocxSource(source);

      case 'CSV':
        return this.processCSVSource(source);

      case 'JSON':
        return this.processJSONSource(source);

      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  private async processTextSource(source: any): Promise<ProcessedSource> {
    if (source.content) {
      return {
        content: source.content,
        metadata: { type: 'text', processedAt: new Date().toISOString() },
      };
    }

    if (source.filePath && fs.existsSync(source.filePath)) {
      const content = fs.readFileSync(source.filePath, 'utf-8');
      return {
        content,
        metadata: {
          type: 'text',
          filePath: source.filePath,
          processedAt: new Date().toISOString(),
        },
      };
    }

    throw new Error('Text source must have content or filePath');
  }

  private async processPDFSource(source: any): Promise<ProcessedSource> {
    if (!source.filePath || !fs.existsSync(source.filePath)) {
      throw new Error('PDF source must have valid filePath');
    }

    try {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
      const dataBuffer = fs.readFileSync(source.filePath);
      const data = await pdfParse(dataBuffer);

      const content = data.text;
      const metadata = {
        type: 'pdf',
        filePath: source.filePath,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        processedAt: new Date().toISOString(),
      };

      logger.info(`PDF processed successfully: ${source.filePath}`, {
        pages: data.numpages,
        contentLength: content.length,
      });

      return { content, metadata };
    } catch (error: any) {
      logger.error('Error processing PDF:', {
        error: error?.message,
        filePath: source.filePath,
        stack: error?.stack?.slice(0, 500),
      });
      throw error;
    }
  }

  /**
   * Processa fonte do Notion usando API oficial
   */
  private async processNotionSource(
    source: any,
    notionService: NotionService
  ): Promise<ProcessedSource> {
    if (!source.sourceUrl) {
      throw new Error('Notion source must have sourceUrl');
    }

    try {
      // Validar conexão com API
      const isConnected = await notionService.testConnection();
      if (!isConnected) {
        throw new Error(
          'Failed to connect to Notion API. Please check your API key.'
        );
      }

      // Ler conteúdo da página via API
      const content = await notionService.readPageContent(source.sourceUrl);

      if (!content) {
        throw new Error(
          'Could not extract content from Notion page via API'
        );
      }

      // Extrair metadados da URL
      const pageIdMatch = source.sourceUrl.match(/([a-f0-9]{32})/);
      const metadata = {
        type: 'notion',
        source: 'api', // Indicar que veio da API
        url: source.sourceUrl,
        pageId: pageIdMatch ? pageIdMatch[1] : null,
        extractedAt: new Date().toISOString(),
      };

      logger.info(`Notion page content extracted via API: ${source.sourceUrl}`, {
        contentLength: content.length,
        pageId: metadata.pageId,
      });

      return { content, metadata };
    } catch (error: any) {
      logger.error('Error processing Notion source via API:', {
        error: error?.message,
        sourceUrl: source.sourceUrl,
        code: error?.code,
      });

      // Re-throw com mensagem mais clara
      if (error?.code === 'unauthorized') {
        throw new Error(
          'Notion API key is invalid or expired. Please update your API key in settings.'
        );
      } else if (error?.code === 'object_not_found') {
        throw new Error(
          'Notion page not found or not accessible. Please check the page URL and ensure the integration has access.'
        );
      }

      throw error;
    }
  }

  private async processURLSource(source: any): Promise<ProcessedSource> {
    // TODO: Implementar scraping de URL
    // Pode usar cheerio, puppeteer, etc.
    logger.warn('URL source processing not yet implemented');
    throw new Error('URL source processing not yet implemented');
  }

  private async processDocxSource(source: any): Promise<ProcessedSource> {
    if (!source.filePath || !fs.existsSync(source.filePath)) {
      throw new Error('DOCX source must have valid filePath');
    }

    try {
      const result = await mammoth.extractRawText({ path: source.filePath });
      const content = result.value;
      const messages = result.messages;

      // Verificar se há erros ou avisos
      const errors = messages.filter((m) => m.type === 'error');
      const warnings = messages.filter((m) => m.type === 'warning');

      if (errors.length > 0) {
        logger.warn('DOCX processing completed with errors:', {
          filePath: source.filePath,
          errors: errors.map((e) => e.message),
        });
      }

      const metadata = {
        type: 'docx',
        filePath: source.filePath,
        processedAt: new Date().toISOString(),
        warnings: warnings.length,
        errors: errors.length,
      };

      logger.info(`DOCX processed successfully: ${source.filePath}`, {
        contentLength: content.length,
        warnings: warnings.length,
      });

      return { content, metadata };
    } catch (error: any) {
      logger.error('Error processing DOCX:', {
        error: error?.message,
        filePath: source.filePath,
        stack: error?.stack?.slice(0, 500),
      });
      throw error;
    }
  }

  private async processCSVSource(source: any): Promise<ProcessedSource> {
    if (!source.filePath || !fs.existsSync(source.filePath)) {
      throw new Error('CSV source must have valid filePath');
    }

    try {
      // Processamento básico de CSV
      const content = fs.readFileSync(source.filePath, 'utf-8');
      const lines = content.split('\n');
      const formattedContent = lines
        .filter((line) => line.trim())
        .map((line, index) => {
          if (index === 0) {
            return `Cabeçalho: ${line}`;
          }
          return `Linha ${index}: ${line}`;
        })
        .join('\n');

      return {
        content: formattedContent,
        metadata: {
          type: 'csv',
          filePath: source.filePath,
          lines: lines.length,
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Error processing CSV:', error);
      throw error;
    }
  }

  private async processJSONSource(source: any): Promise<ProcessedSource> {
    try {
      let jsonData: any;

      if (source.content) {
        jsonData = JSON.parse(source.content);
      } else if (source.filePath && fs.existsSync(source.filePath)) {
        const fileContent = fs.readFileSync(source.filePath, 'utf-8');
        jsonData = JSON.parse(fileContent);
      } else {
        throw new Error('JSON source must have content or filePath');
      }

      // Converter JSON para texto formatado
      const content = JSON.stringify(jsonData, null, 2);

      return {
        content,
        metadata: {
          type: 'json',
          keys: Object.keys(jsonData),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Error processing JSON:', error);
      throw error;
    }
  }

  /**
   * Divide conteúdo em chunks para busca semântica
   */
  async chunkContent(
    content: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
  ): Promise<string[]> {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      chunks.push(chunk);

      start = end - chunkOverlap;
    }

    return chunks;
  }
}

