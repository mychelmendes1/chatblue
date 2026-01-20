import { prisma } from '../config/database.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface MessageData {
  id: string;
  content: string;
  createdAt: Date;
  ticket: {
    id: string;
    protocol: string;
    status: string;
    resolvedAt: Date | null;
    contact: {
      name: string | null;
      phone: string;
    };
  };
}

async function generateFAQFromConversations() {
  console.log('🔍 Analisando conversas atendidas...\n');

  try {
    // Buscar mensagens de clientes de tickets resolvidos/fechados dos últimos 30 dias
    const messages = await prisma.message.findMany({
      where: {
        isFromMe: false, // Apenas mensagens dos clientes
        type: 'TEXT',
        ticket: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
          },
        },
        content: {
          not: null,
        },
      },
      include: {
        ticket: {
          include: {
            contact: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Analisar até 1000 mensagens
    });

    console.log(`📊 Total de mensagens encontradas: ${messages.length}`);

    // Agrupar por categorias e perguntas similares
    const faqCategories: Record<string, Array<{ question: string; frequency: number; examples: Array<{ text: string; protocol: string }> }>> = {
      'Acesso e Conexão': [],
      'Problemas Técnicos': [],
      'Dúvidas Comerciais': [],
      'Pedidos e Entregas': [],
      'Pagamentos e Reembolsos': [],
      'Uso do Sistema': [],
      'Outras Dúvidas': [],
    };

    // Processar mensagens e categorizar
    for (const message of messages) {
      const content = message.content || '';
      if (content.length < 10) continue; // Ignorar mensagens muito curtas

      // Categorizar por palavras-chave
      let category = 'Outras Dúvidas';
      const lowerContent = content.toLowerCase();

      if (lowerContent.match(/como (fazer|conectar|acessar|usar|configurar)|whatsapp|conexão|conexao|qr|qrcode|link|login|senha|acessar/i)) {
        category = 'Acesso e Conexão';
      } else if (lowerContent.match(/erro|problema|não funciona|nao funciona|trava|lento|bug|erro técnico|erro tecnico|não está|nao esta|não abre|nao abre/i)) {
        category = 'Problemas Técnicos';
      } else if (lowerContent.match(/preço|preco|valor|pagamento|cobrança|cobranca|fatura|plano|assinatura|desconto|promoção|promocao|custo|quanto custa/i)) {
        category = 'Dúvidas Comerciais';
      } else if (lowerContent.match(/pedido|entrega|prazo|status|rastreio|quando chega|envio|recebimento|frete|endereço|endereco/i)) {
        category = 'Pedidos e Entregas';
      } else if (lowerContent.match(/reembolso|devolução|devolucao|troca|cancelamento|estorno|dinheiro|devolver|recuperar/i)) {
        category = 'Pagamentos e Reembolsos';
      } else if (lowerContent.match(/como usar|como fazer|funcionalidade|recurso|ajuda|dúvida|duvida|explica|tutorial|guia/i)) {
        category = 'Uso do Sistema';
      }

      // Normalizar pergunta (primeiras palavras)
      const questionWords = content.trim().split(/\s+/).slice(0, 10).join(' ').toLowerCase();
      
      // Verificar se já existe pergunta similar
      let existingFAQ = faqCategories[category].find(faq => {
        const faqWords = faq.question.toLowerCase().split(/\s+/).slice(0, 10).join(' ');
        // Verificar similaridade básica (pelo menos 30% das palavras em comum)
        const faqWordSet = new Set(faqWords.split(' '));
        const questionWordSet = new Set(questionWords.split(' '));
        const intersection = [...faqWordSet].filter(x => questionWordSet.has(x)).length;
        const union = new Set([...faqWordSet, ...questionWordSet]).size;
        const similarity = intersection / union;
        return similarity > 0.3;
      });

      if (existingFAQ) {
        existingFAQ.frequency++;
        if (existingFAQ.examples.length < 3) {
          existingFAQ.examples.push({
            text: content.length > 150 ? content.substring(0, 150) + '...' : content,
            protocol: message.ticket.protocol,
          });
        }
      } else {
        // Nova pergunta
        const shortQuestion = content.length > 80 ? content.substring(0, 80) + '...' : content;
        faqCategories[category].push({
          question: shortQuestion,
          frequency: 1,
          examples: [{
            text: content.length > 150 ? content.substring(0, 150) + '...' : content,
            protocol: message.ticket.protocol,
          }],
        });
      }
    }

    // Contar tickets únicos
    const uniqueTickets = new Set(messages.map(m => m.ticket.id)).size;

    // Gerar arquivo Markdown
    let markdown = `---
sidebar_position: 51
title: FAQ - Atendimentos Reais
description: Perguntas frequentes extraídas das conversas atendidas pelo time
---

# FAQ - Baseado em Atendimentos Reais

Esta documentação foi gerada automaticamente a partir das conversas atendidas pelo time nos últimos 30 dias.

:::info Informações
- **Última atualização:** ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
- **Total de tickets analisados:** ${uniqueTickets}
- **Total de mensagens analisadas:** ${messages.length}
:::

---

`;

    // Ordenar categorias por frequência total
    const sortedCategories = Object.entries(faqCategories)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => b.frequency - a.frequency).slice(0, 15), // Top 15 por categoria
        totalFrequency: items.reduce((sum, item) => sum + item.frequency, 0),
      }))
      .filter(cat => cat.items.length > 0)
      .sort((a, b) => b.totalFrequency - a.totalFrequency);

    console.log(`\n📝 Gerando FAQ com ${sortedCategories.length} categorias...\n`);

    // Gerar conteúdo para cada categoria
    for (const { category, items, totalFrequency } of sortedCategories) {
      markdown += `## ${category}\n\n`;
      markdown += `**${items.length}** perguntas frequentes encontradas (${totalFrequency} ${totalFrequency === 1 ? 'ocorrência' : 'ocorrências'})\n\n`;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        markdown += `### ${i + 1}. ${item.question}\n\n`;
        markdown += `*Frequência: ${item.frequency} ${item.frequency === 1 ? 'ocorrência' : 'ocorrências'}*\n\n`;

        if (item.examples.length > 0) {
          markdown += `**Exemplos de perguntas similares:**\n\n`;
          for (const example of item.examples) {
            markdown += `- "${example.text}" *(Protocolo: ${example.protocol})*\n`;
          }
          markdown += `\n`;
        }

        markdown += `---\n\n`;
      }
    }

    // Adicionar seção de estatísticas
    markdown += `## 📊 Estatísticas\n\n`;
    markdown += `| Categoria | Perguntas | Ocorrências |\n`;
    markdown += `|-----------|-----------|-------------|\n`;
    for (const { category, items, totalFrequency } of sortedCategories) {
      markdown += `| ${category} | ${items.length} | ${totalFrequency} |\n`;
    }
    markdown += `\n---\n\n`;
    markdown += `*Este FAQ é atualizado automaticamente conforme novos atendimentos são realizados.*\n`;

    // Salvar arquivo
    const outputPath = join(process.cwd(), '..', 'docs-site', 'docs', 'treinamento', 'faq-atendimentos.md');
    writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`✅ FAQ gerado com sucesso!\n`);
    console.log(`📄 Arquivo: docs-site/docs/treinamento/faq-atendimentos.md\n`);
    console.log(`📊 Resumo:`);
    console.log(`   - Categorias: ${sortedCategories.length}`);
    console.log(`   - Total de perguntas: ${sortedCategories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
    console.log(`   - Total de ocorrências: ${sortedCategories.reduce((sum, cat) => sum + cat.totalFrequency, 0)}\n`);

  } catch (error) {
    console.error('❌ Erro ao gerar FAQ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateFAQFromConversations().catch(console.error);

