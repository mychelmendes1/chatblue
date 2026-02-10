import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';

// Decision types for transfer analysis
export type TransferDecision = 'TRANSFER_CERTAIN' | 'NO_TRANSFER' | 'UNCERTAIN';

export interface PreAnalysisResult {
  decision: TransferDecision;
  shouldTransfer: boolean;
  departmentId?: string | null;
  departmentName?: string | null;
  confidence: number; // 0-100
  reason: string;
}

export interface PostAnalysisResult {
  shouldTransfer: boolean;
  departmentId?: string | null;
  departmentName?: string | null;
  adaptedMessage?: string;
  reason: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Department {
  id: string;
  name: string;
}

export class TransferAnalyzerService {
  private anthropicClient: Anthropic | null = null;
  private readonly HAIKU_MODEL = 'claude-3-haiku-20240307';

  constructor(apiKey: string) {
    if (apiKey) {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  /**
   * Pre-analysis: Analyze user message BEFORE generating AI response
   * This is fast and prevents unnecessary AI response generation for obvious transfer cases
   */
  async preAnalyze(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    companyId: string
  ): Promise<PreAnalysisResult> {
    if (!this.anthropicClient) {
      logger.warn('TransferAnalyzer: No Anthropic client available, defaulting to UNCERTAIN');
      return {
        decision: 'UNCERTAIN',
        shouldTransfer: false,
        confidence: 0,
        reason: 'No AI client available for analysis',
      };
    }

    try {
      // Get available departments for the company
      const departments = await this.getDepartments(companyId);
      const departmentList = departments.map(d => d.name).join(', ');

      // Build context from conversation history
      const contextStr = conversationHistory
        .slice(-5) // Last 5 messages
        .map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`)
        .join('\n');

      const prompt = `Você é um analisador de intenção de transferência para atendimento ao cliente.

DEPARTAMENTOS DISPONÍVEIS: ${departmentList || 'Nenhum cadastrado'}

CONTEXTO DA CONVERSA:
${contextStr || 'Nenhum histórico'}

MENSAGEM ATUAL DO CLIENTE:
${userMessage}

REGRAS DE DECISÃO:

TRANSFER_CERTAIN (transferir imediatamente):
- Cliente pede EXPLICITAMENTE: "quero falar com humano", "me transfere", "quero um atendente"
- Cliente demonstra frustração clara com a IA: "você não entende", "essa IA não ajuda"
- Assunto requer autorização humana: cancelamento, reembolso, reclamação formal
- Cliente menciona problema urgente financeiro/legal que precisa de decisão humana

NO_TRANSFER (não transferir):
- Cliente faz perguntas sobre produtos/serviços
- Cliente confirma informações: "ok", "pode", "sim", "entendi", "certo"
- Cliente quer saber preços, detalhes ou informações gerais
- Saudações simples: "oi", "olá", "bom dia"

UNCERTAIN (incerto - a IA vai decidir na resposta):
- Cliente demonstra INTENÇÃO DE COMPRA: "quero", "vou comprar", "quero o plano X"
- Mensagem ambígua que pode indicar insatisfação
- Cliente menciona problema mas não está claro se precisa de humano
- Contexto insuficiente para decidir

NOTA: Quando o cliente expressa intenção de compra ("quero o Diamond"), use UNCERTAIN para permitir que a IA decida se transfere para vendedor ou continua atendimento.

Responda APENAS com JSON válido (sem markdown, sem explicação):
{"decision": "TRANSFER_CERTAIN" | "NO_TRANSFER" | "UNCERTAIN", "department": "nome do departamento ou null", "confidence": 0-100, "reason": "explicação breve"}`;

      const response = await this.anthropicClient.messages.create({
        model: this.HAIKU_MODEL,
        max_tokens: 200,
        temperature: 0.1, // Low temperature for more deterministic results
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text.trim() 
        : '';

      logger.debug('TransferAnalyzer preAnalyze raw response:', { responseText });

      // Parse JSON response
      const result = this.parseJsonResponse(responseText);

      // Map department name to ID
      let departmentId: string | null = null;
      let departmentName: string | null = result.department;

      if (result.department) {
        const matchedDept = departments.find(
          d => d.name.toLowerCase() === result.department?.toLowerCase()
        );
        if (matchedDept) {
          departmentId = matchedDept.id;
          departmentName = matchedDept.name;
        }
      }

      const analysisResult: PreAnalysisResult = {
        decision: result.decision || 'UNCERTAIN',
        shouldTransfer: result.decision === 'TRANSFER_CERTAIN',
        departmentId,
        departmentName,
        confidence: result.confidence || 50,
        reason: result.reason || 'No reason provided',
      };

      logger.info('TransferAnalyzer preAnalyze result:', {
        userMessage: userMessage.slice(0, 100),
        decision: analysisResult.decision,
        confidence: analysisResult.confidence,
        department: analysisResult.departmentName,
        reason: analysisResult.reason,
      });

      return analysisResult;
    } catch (error: any) {
      logger.error('TransferAnalyzer preAnalyze error:', {
        message: error?.message,
        stack: error?.stack?.slice(0, 300),
      });

      return {
        decision: 'UNCERTAIN',
        shouldTransfer: false,
        confidence: 0,
        reason: `Analysis error: ${error?.message}`,
      };
    }
  }

  /**
   * Post-analysis: Analyze AI response AFTER it's generated
   * Used for UNCERTAIN cases to validate if the response indicates a transfer
   */
  async postAnalyze(
    userMessage: string,
    aiResponse: string,
    conversationHistory: ConversationMessage[],
    companyId: string
  ): Promise<PostAnalysisResult> {
    if (!this.anthropicClient) {
      logger.warn('TransferAnalyzer: No Anthropic client available for post-analysis');
      return {
        shouldTransfer: false,
        reason: 'No AI client available for analysis',
      };
    }

    try {
      // Get available departments
      const departments = await this.getDepartments(companyId);
      const departmentList = departments.map(d => d.name).join(', ');

      // Build context
      const contextStr = conversationHistory
        .slice(-3)
        .map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`)
        .join('\n');

      const prompt = `Você é um validador de transferência para atendimento ao cliente.

DEPARTAMENTOS DISPONÍVEIS: ${departmentList || 'Nenhum cadastrado'}

CONTEXTO ANTERIOR:
${contextStr || 'Nenhum histórico'}

MENSAGEM DO CLIENTE:
${userMessage}

RESPOSTA GERADA PELA IA:
${aiResponse}

TAREFA: Verifique se a resposta da IA indica transferência. SE A IA DISSE QUE VAI TRANSFERIR, DEVE TRANSFERIR.

REGRAS (em ordem de prioridade):
1. **PRIORIDADE MÁXIMA**: Se a resposta contém frases como "vou transferir", "transferindo", "vou conectar você com", "direcionando seu atendimento", "vou te encaminhar", "vou passar você para" → SEMPRE TRANSFERIR
2. Se a resposta contém blocos formatados como "TRANSFERINDO PARA:", "---" seguido de dados do cliente (nome, email, telefone) → SEMPRE TRANSFERIR (isso é uma nota interna de transferência)
3. Se a IA menciona que vai encaminhar para "especialista", "consultor", "atendente humano" para finalizar venda → TRANSFERIR para Comercial
4. Se a IA menciona que vai encaminhar para resolver problema/suporte → TRANSFERIR para Suporte
5. Se a IA menciona que vai encaminhar por questões financeiras → TRANSFERIR para Financeiro
6. Só NÃO TRANSFERIR se a resposta da IA NÃO menciona nenhuma transferência ou encaminhamento

IMPORTANTE: O cliente pode estar interessado em compra E a IA decidiu transferir para um consultor finalizar. Isso é VÁLIDO e DEVE TRANSFERIR.
IMPORTANTE: Se a resposta contém qualquer variação de "transferir", "encaminhar", "direcionar" para outro setor/pessoa, SEMPRE retorne shouldTransfer: true.

Responda APENAS com JSON válido:
{"shouldTransfer": true/false, "department": "nome do departamento ou null", "reason": "explicação breve"}`;

      const response = await this.anthropicClient.messages.create({
        model: this.HAIKU_MODEL,
        max_tokens: 200,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text.trim() 
        : '';

      logger.debug('TransferAnalyzer postAnalyze raw response:', { responseText });

      const result = this.parseJsonResponse(responseText);

      // Map department name to ID
      let departmentId: string | null = null;
      let departmentName: string | null = result.department;

      if (result.department) {
        const matchedDept = departments.find(
          d => d.name.toLowerCase() === result.department?.toLowerCase()
        );
        if (matchedDept) {
          departmentId = matchedDept.id;
          departmentName = matchedDept.name;
        }
      }

      // If transferring, create an adapted message
      let adaptedMessage: string | undefined;
      if (result.shouldTransfer) {
        adaptedMessage = departmentName
          ? `Vou transferir você para o setor de ${departmentName}. Um de nossos atendentes vai continuar seu atendimento em breve. 🙏`
          : `Vou transferir você para um de nossos atendentes. Aguarde um momento, por favor. 🙏`;
      }

      const analysisResult: PostAnalysisResult = {
        shouldTransfer: result.shouldTransfer || false,
        departmentId,
        departmentName,
        adaptedMessage,
        reason: result.reason || 'No reason provided',
      };

      logger.info('TransferAnalyzer postAnalyze result:', {
        userMessage: userMessage.slice(0, 50),
        aiResponse: aiResponse.slice(0, 100),
        shouldTransfer: analysisResult.shouldTransfer,
        department: analysisResult.departmentName,
        reason: analysisResult.reason,
      });

      return analysisResult;
    } catch (error: any) {
      logger.error('TransferAnalyzer postAnalyze error:', {
        message: error?.message,
        stack: error?.stack?.slice(0, 300),
      });

      return {
        shouldTransfer: false,
        reason: `Analysis error: ${error?.message}`,
      };
    }
  }

  /**
   * Get departments for a company
   * Only returns departments that have at least 1 user assigned
   */
  private async getDepartments(companyId: string): Promise<Department[]> {
    try {
      const departments = await prisma.department.findMany({
        where: { 
          companyId, 
          isActive: true,
          // Only departments with at least 1 user
          users: {
            some: {}
          }
        },
        select: { id: true, name: true },
      });
      
      logger.debug('TransferAnalyzer: Available departments with users', {
        companyId,
        departments: departments.map(d => d.name),
      });
      
      return departments;
    } catch (error) {
      logger.error('TransferAnalyzer: Error fetching departments', { error });
      return [];
    }
  }

  /**
   * Parse JSON response from AI, handling potential formatting issues
   */
  private parseJsonResponse(text: string): any {
    try {
      // Try direct parse first
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Continue to next method
        }
      }

      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // Continue to next method
        }
      }

      logger.warn('TransferAnalyzer: Could not parse JSON response', { text });
      return {};
    }
  }
}

