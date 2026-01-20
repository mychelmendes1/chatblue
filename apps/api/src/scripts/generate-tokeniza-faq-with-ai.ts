import { prisma } from '../config/database.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const TOKENIZA_COMPANY_ID = 'cmjnjw8kc0000ffj4i6n4x8qu';

interface FAQItem {
  question: string;
  frequency: number;
  examples: Array<{ text: string; protocol: string; timestamp: Date }>;
  responses: Array<{ text: string; responder: string; timestamp: Date }>;
}

async function generateFAQWithAI() {
  console.log('🔍 Analisando histórico de atendimento da Tokeniza...\n');

  // Buscar configuração de IA da empresa Tokeniza
  const companySettings = await prisma.companySettings.findUnique({
    where: { companyId: TOKENIZA_COMPANY_ID },
    select: {
      aiProvider: true,
      aiApiKey: true,
    },
  });

  if (!companySettings?.aiApiKey) {
    console.error('❌ API Key de IA não configurada para a empresa Tokeniza');
    console.log('Por favor, configure a API Key de IA nas configurações da empresa Tokeniza');
    process.exit(1);
  }

  const aiProvider = companySettings.aiProvider || 'openai';
  const aiApiKey = companySettings.aiApiKey;

  // Criar cliente baseado no provider
  const openai = aiProvider === 'openai' ? new OpenAI({ apiKey: aiApiKey }) : null;
  const anthropic = aiProvider === 'anthropic' ? new Anthropic({ apiKey: aiApiKey }) : null;

  if (!openai && !anthropic) {
    console.error(`❌ Provider de IA não suportado: ${aiProvider}`);
    process.exit(1);
  }

  console.log(`🤖 Usando provider: ${aiProvider}\n`);

  try {
    // Buscar tickets da Tokeniza que foram resolvidos/fechados
    const tickets = await prisma.ticket.findMany({
      where: {
        companyId: TOKENIZA_COMPANY_ID,
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
        messages: {
          where: {
            type: 'TEXT',
            content: { not: null },
          },
          include: {
            sender: {
              select: {
                name: true,
                isAI: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500, // Analisar até 500 tickets
    });

    console.log(`📊 Total de tickets analisados: ${tickets.length}\n`);

    // Agrupar perguntas e respostas
    const faqCategories: Record<string, FAQItem[]> = {
      'Acesso e Login': [],
      'Pagamentos e Distribuições': [],
      'Staking e Rendimentos': [],
      'Problemas Técnicos': [],
      'Comunidade e Grupos': [],
      'Informações Gerais': [],
      'Outras Dúvidas': [],
    };

    // Processar cada ticket
    for (const ticket of tickets) {
      const messages = ticket.messages;
      if (messages.length === 0) continue;

      // Separar perguntas (clientes) de respostas (atendentes)
      let currentQuestion: { text: string; protocol: string; timestamp: Date } | null = null;
      const questionResponses: Array<{ text: string; responder: string; timestamp: Date }> = [];

      for (const message of messages) {
        const content = message.content || '';
        if (content.length < 10) continue;

        if (!message.isFromMe) {
          // Mensagem do cliente - nova pergunta
          if (currentQuestion && questionResponses.length > 0) {
            // Processar pergunta anterior com suas respostas
            processQuestion(currentQuestion, questionResponses, faqCategories);
          }
          currentQuestion = {
            text: content,
            protocol: ticket.protocol,
            timestamp: message.createdAt,
          };
          questionResponses.length = 0; // Reset respostas
        } else {
          // Mensagem do atendente - resposta
          if (currentQuestion) {
            const responderName = message.sender?.name || (message.sender?.isAI ? 'Assistente IA' : 'Atendente');
            questionResponses.push({
              text: content,
              responder: responderName,
              timestamp: message.createdAt,
            });
          }
        }
      }

      // Processar última pergunta do ticket
      if (currentQuestion && questionResponses.length > 0) {
        processQuestion(currentQuestion, questionResponses, faqCategories);
      }
    }

    console.log('🤖 Gerando respostas profissionais com IA...\n');

    // Ordenar categorias e preparar para IA
    const sortedCategories = Object.entries(faqCategories)
      .map(([category, items]) => ({
        category,
        items: items
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 20), // Top 20 por categoria
        totalFrequency: items.reduce((sum, item) => sum + item.frequency, 0),
      }))
      .filter(cat => cat.items.length > 0)
      .sort((a, b) => b.totalFrequency - a.totalFrequency);

    // Gerar respostas com IA para cada pergunta
    const faqWithAI: Array<{
      category: string;
      question: string;
      frequency: number;
      answer: string;
      examples: string[];
    }> = [];

    for (const { category, items } of sortedCategories) {
      for (const item of items) {
        // Buscar resposta mais completa dos atendentes
        const bestResponse = item.responses.sort((a, b) => b.text.length - a.text.length)[0] || item.responses[0];
        const examplesText = item.examples.map(e => e.text).join('\n');
        const responsesText = item.responses.map(r => r.text).join('\n\n');

        try {
          let aiAnswer = '';

          if (openai) {
            // Usar OpenAI
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `Você é um especialista em atendimento ao cliente da Tokeniza, uma empresa de criptomoedas e investimentos tokenizados.
                  
Sua tarefa é criar uma resposta profissional, clara e completa para uma pergunta frequente de cliente, baseando-se nas respostas que os atendentes deram anteriormente.

A resposta deve ser:
- Profissional e educada
- Clara e objetiva
- Útil e completa
- Em português brasileiro
- Sem incluir informações de protocolo ou detalhes específicos de atendimento
- Focada em ajudar o cliente`,
                },
                {
                  role: 'user',
                  content: `Pergunta do cliente: "${item.question}"

Respostas que os atendentes deram anteriormente:
${responsesText.substring(0, 2000)}

Crie uma resposta profissional e completa para essa pergunta, baseando-se nas respostas dos atendentes mas tornando-a mais clara e objetiva.`,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            });

            aiAnswer = completion.choices[0]?.message?.content || bestResponse?.text || 'Resposta não disponível';

          } else if (anthropic) {
            // Usar Anthropic
            const message = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 500,
              temperature: 0.7,
              system: `Você é um especialista em atendimento ao cliente da Tokeniza, uma empresa de criptomoedas e investimentos tokenizados.
              
Sua tarefa é criar uma resposta profissional, clara e completa para uma pergunta frequente de cliente, baseando-se nas respostas que os atendentes deram anteriormente.

A resposta deve ser:
- Profissional e educada
- Clara e objetiva
- Útil e completa
- Em português brasileiro
- Sem incluir informações de protocolo ou detalhes específicos de atendimento
- Focada em ajudar o cliente`,
              messages: [
                {
                  role: 'user',
                  content: `Pergunta do cliente: "${item.question}"

Respostas que os atendentes deram anteriormente:
${responsesText.substring(0, 2000)}

Crie uma resposta profissional e completa para essa pergunta, baseando-se nas respostas dos atendentes mas tornando-a mais clara e objetiva.`,
                },
              ],
            });

            aiAnswer = message.content[0]?.type === 'text' 
              ? message.content[0].text 
              : bestResponse?.text || 'Resposta não disponível';
          } else {
            aiAnswer = bestResponse?.text || 'Resposta não disponível';
          }

          faqWithAI.push({
            category,
            question: item.question,
            frequency: item.frequency,
            answer: aiAnswer,
            examples: item.examples.map(e => e.text.substring(0, 100)),
          });

          console.log(`✅ Processado: ${item.question.substring(0, 50)}...`);
          
          // Rate limiting - esperar um pouco entre chamadas
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`❌ Erro ao processar pergunta: ${error.message}`);
          // Usar resposta original se IA falhar
          faqWithAI.push({
            category,
            question: item.question,
            frequency: item.frequency,
            answer: bestResponse?.text || 'Resposta não disponível',
            examples: item.examples.map(e => e.text.substring(0, 100)),
          });
        }
      }
    }

    // Gerar arquivo Markdown
    let markdown = `---
sidebar_position: 52
title: FAQ Tokeniza - Gerado com IA
description: Perguntas frequentes dos clientes Tokeniza com respostas profissionais geradas por IA
---

# FAQ Tokeniza - Respostas Profissionais

Este FAQ foi gerado automaticamente usando Inteligência Artificial, analisando o histórico de atendimento da Tokeniza e criando respostas profissionais baseadas nas respostas dos atendentes.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
**Total de perguntas:** ${faqWithAI.length}
**Tickets analisados:** ${tickets.length}

:::info
As respostas foram geradas por IA com base nas respostas reais dos atendentes, mas foram aprimoradas para maior clareza e profissionalismo.
:::

---

`;

    // Agrupar por categoria
    const byCategory = faqWithAI.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof faqWithAI>);

    // Gerar conteúdo por categoria
    for (const [category, items] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
      markdown += `## ${category}\n\n`;
      markdown += `**${items.length}** perguntas frequentes\n\n`;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        markdown += `### ${i + 1}. ${item.question}\n\n`;
        markdown += `*Frequência: ${item.frequency} ${item.frequency === 1 ? 'ocorrência' : 'ocorrências'}*\n\n`;
        
        markdown += `**Resposta:**\n\n`;
        markdown += `${item.answer}\n\n`;

        if (item.examples.length > 0) {
          markdown += `**Exemplos de perguntas similares:**\n\n`;
          for (const example of item.examples.slice(0, 3)) {
            markdown += `- "${example}..."\n`;
          }
          markdown += `\n`;
        }

        markdown += `---\n\n`;
      }
    }

    // Adicionar estatísticas
    markdown += `## 📊 Estatísticas\n\n`;
    markdown += `| Categoria | Perguntas | Total Ocorrências |\n`;
    markdown += `|-----------|-----------|------------------|\n`;
    for (const [category, items] of Object.entries(byCategory)) {
      const totalFreq = items.reduce((sum, item) => sum + item.frequency, 0);
      markdown += `| ${category} | ${items.length} | ${totalFreq} |\n`;
    }

    // Salvar arquivo (process.cwd() é apps/api, então precisamos subir 2 níveis para a raiz)
    const outputDir = join(process.cwd(), '..', '..', 'docs-site', 'docs', 'treinamento');
    mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, 'faq-tokeniza-ai.md');
    writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`\n✅ FAQ Tokeniza gerado com sucesso!\n`);
    console.log(`📄 Arquivo: ${outputPath}\n`);
    console.log(`📊 Resumo:`);
    console.log(`   - Categorias: ${Object.keys(byCategory).length}`);
    console.log(`   - Total de perguntas: ${faqWithAI.length}`);
    console.log(`   - Total de ocorrências: ${faqWithAI.reduce((sum, item) => sum + item.frequency, 0)}\n`);

  } catch (error) {
    console.error('❌ Erro ao gerar FAQ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function processQuestion(
  question: { text: string; protocol: string; timestamp: Date },
  responses: Array<{ text: string; responder: string; timestamp: Date }>,
  categories: Record<string, FAQItem[]>
) {
  const content = question.text;
  if (content.length < 10) return;

  // Categorizar por palavras-chave
  let category = 'Outras Dúvidas';
  const lowerContent = content.toLowerCase();

  if (lowerContent.match(/login|acesso|entrar|conta|cadastro|senha|tokeniza academy|plataforma comercial/i)) {
    category = 'Acesso e Login';
  } else if (lowerContent.match(/pagamento|pagamentos|distribuição|distribuicao|otc|tbrl|rendimento|receber|depósito|deposito/i)) {
    category = 'Pagamentos e Distribuições';
  } else if (lowerContent.match(/staking|stake|rendimento|aproveitar|tokeniza stake|usdt/i)) {
    category = 'Staking e Rendimentos';
  } else if (lowerContent.match(/problema|erro|não funciona|nao funciona|trava|bug|técnico|tecnico/i)) {
    category = 'Problemas Técnicos';
  } else if (lowerContent.match(/grupo|whatsapp|discord|comunidade|tokeniza private|telegram/i)) {
    category = 'Comunidade e Grupos';
  } else if (lowerContent.match(/prazo|quando|informação|informacao|como funciona|o que é|o que e/i)) {
    category = 'Informações Gerais';
  }

  // Normalizar pergunta
  const questionWords = content.trim().split(/\s+/).slice(0, 10).join(' ').toLowerCase();
  
  // Verificar similaridade
  let existing = categories[category].find(faq => {
    const faqWords = faq.question.toLowerCase().split(/\s+/).slice(0, 10).join(' ');
    const faqSet = new Set(faqWords.split(' '));
    const wordSet = new Set(questionWords.split(' '));
    const intersection = [...faqSet].filter(x => wordSet.has(x)).length;
    const union = new Set([...faqSet, ...wordSet]).size;
    return (intersection / union) > 0.3;
  });

  if (existing) {
    existing.frequency++;
    if (existing.examples.length < 3) {
      existing.examples.push({
        text: content.length > 150 ? content.substring(0, 150) + '...' : content,
        protocol: question.protocol,
        timestamp: question.timestamp,
      });
    }
    // Adicionar respostas (se não tiver muitas ainda)
    if (existing.responses.length < 5) {
      existing.responses.push(...responses);
    }
  } else {
    const shortQuestion = content.length > 100 ? content.substring(0, 100) + '...' : content;
    categories[category].push({
      question: shortQuestion,
      frequency: 1,
      examples: [{
        text: content.length > 150 ? content.substring(0, 150) + '...' : content,
        protocol: question.protocol,
        timestamp: question.timestamp,
      }],
      responses: [...responses],
    });
  }
}

generateFAQWithAI().catch(console.error);

