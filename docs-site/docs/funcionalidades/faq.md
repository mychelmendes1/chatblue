---
sidebar_position: 8
title: FAQ
description: Gerenciamento de perguntas frequentes no ChatBlue
---

# FAQ

O modulo de FAQ (Frequently Asked Questions) permite gerenciar perguntas e respostas frequentes que auxiliam tanto agentes quanto a IA a fornecer respostas rapidas e consistentes.

## Visao Geral

O sistema de FAQ oferece:

- **Respostas padronizadas** para perguntas comuns
- **Organizacao por categorias** e departamentos
- **Integracao direta com IA** para respostas automaticas
- **Keywords para matching** inteligente
- **Metricas de uso** para otimizacao
- **Respostas rapidas** para agentes

## Interface do Usuario

### Lista de FAQs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Perguntas Frequentes (FAQ)                           [+ Nova FAQ] [Filtros]│
├─────────────────────────────────────────────────────────────────────────────┤
│  [Buscar pergunta...]                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Categoria: [Todas ▼]   Departamento: [Todos ▼]    Ordenar: [Mais usadas ▼] │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ P: Quais sao as formas de pagamento aceitas?                          │ │
│  │ ────────────────────────────────────────────                          │ │
│  │ R: Aceitamos cartao de credito (Visa, Mastercard, Elo), cartao de    │ │
│  │    debito, PIX, boleto bancario e transferencia. Para compras        │ │
│  │    acima de R$ 500, parcelamos em ate 12x sem juros.                 │ │
│  │                                                                        │ │
│  │ Categoria: Financeiro | Keywords: pagamento, pagar, cartao, pix      │ │
│  │ Usos: 456 | IA: 234                              [Editar] [Excluir]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ P: Qual o prazo de entrega?                                           │ │
│  │ ────────────────────────────────────────────────                      │ │
│  │ R: O prazo de entrega varia de acordo com sua regiao:                │ │
│  │    - Capitais: 3 a 5 dias uteis                                      │ │
│  │    - Interior: 5 a 10 dias uteis                                     │ │
│  │    - Regioes remotas: 10 a 15 dias uteis                             │ │
│  │                                                                        │ │
│  │ Categoria: Logistica | Keywords: entrega, prazo, chegar, demora      │ │
│  │ Usos: 389 | IA: 198                              [Editar] [Excluir]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ P: Como faco para devolver um produto?                                │ │
│  │ ────────────────────────────────────────────────                      │ │
│  │ R: Para devolver um produto, siga os passos:                         │ │
│  │    1. Acesse "Meus Pedidos" no site                                  │ │
│  │    2. Selecione o pedido e clique em "Solicitar Devolucao"           │ │
│  │    3. Escolha o motivo e confirme                                    │ │
│  │    4. Voce recebera uma etiqueta de postagem por email               │ │
│  │                                                                        │ │
│  │ Categoria: Comercial | Keywords: devolver, devolucao, trocar, troca  │ │
│  │ Usos: 234 | IA: 156                              [Editar] [Excluir]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Mostrando 1-10 de 35 FAQs                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Editor de FAQ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Nova Pergunta Frequente                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Pergunta:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Quais sao as formas de pagamento aceitas?                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Resposta:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Aceitamos as seguintes formas de pagamento:                           │  │
│  │                                                                        │  │
│  │ - Cartao de credito (Visa, Mastercard, Elo, American Express)        │  │
│  │ - Cartao de debito                                                    │  │
│  │ - PIX (pagamento instantaneo)                                         │  │
│  │ - Boleto bancario (prazo de 3 dias uteis)                            │  │
│  │ - Transferencia bancaria                                              │  │
│  │                                                                        │  │
│  │ Para compras acima de R$ 500, oferecemos parcelamento em ate 12x     │  │
│  │ sem juros no cartao de credito.                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Categoria:                           Departamento:                          │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐       │
│  │ Financeiro              ▼  │     │ Todos                  ▼   │       │
│  └─────────────────────────────┘     └─────────────────────────────┘       │
│                                                                              │
│  Keywords (separadas por virgula):                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ pagamento, pagar, cartao, pix, boleto, parcelamento, parcela          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Variacoes da pergunta (uma por linha):                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Como posso pagar?                                                     │  │
│  │ Voces aceitam PIX?                                                    │  │
│  │ Posso pagar com cartao?                                               │  │
│  │ Tem boleto?                                                           │  │
│  │ Parcela em quantas vezes?                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Opcoes:                                                                     │
│  [x] Ativa (visivel para agentes)                                           │
│  [x] Disponivel para IA                                                     │
│  [ ] Destacar como importante                                                │
│                                                                              │
│  [Cancelar]                                                    [Salvar]     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Estrutura da FAQ

```prisma
model FAQ {
  id           String   @id @default(uuid())
  companyId    String
  departmentId String?                      // Departamento especifico
  question     String                       // Pergunta principal
  answer       String                       // Resposta
  keywords     String[] @default([])        // Keywords para matching
  variations   String[] @default([])        // Variacoes da pergunta
  category     String?                      // Categoria
  usageCount   Int      @default(0)         // Vezes usada por agentes
  aiUsageCount Int      @default(0)         // Vezes usada pela IA
  isActive     Boolean  @default(true)
  isAIEnabled  Boolean  @default(true)
  isPinned     Boolean  @default(false)     // Destacada
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

## Keywords e Matching

### Sistema de Keywords

As keywords sao usadas para encontrar a FAQ correta:

```typescript
// Exemplo de FAQ com keywords
{
  question: "Qual o prazo de entrega?",
  answer: "O prazo varia de 3 a 15 dias uteis...",
  keywords: [
    "entrega",
    "prazo",
    "demora",
    "chegar",
    "dias",
    "quando chega",
    "tempo de entrega"
  ]
}
```

### Algoritmo de Matching

```typescript
class FAQMatchingService {
  async findBestMatch(
    companyId: string,
    userMessage: string
  ): Promise<FAQ | null> {
    // 1. Normalizar mensagem
    const normalizedMessage = this.normalize(userMessage);
    const tokens = this.tokenize(normalizedMessage);

    // 2. Buscar FAQs ativas
    const faqs = await prisma.fAQ.findMany({
      where: {
        companyId,
        isActive: true,
        isAIEnabled: true
      }
    });

    // 3. Calcular score para cada FAQ
    const scored = faqs.map(faq => ({
      faq,
      score: this.calculateScore(faq, tokens, normalizedMessage)
    }));

    // 4. Ordenar por score
    scored.sort((a, b) => b.score - a.score);

    // 5. Retornar melhor match se score > threshold
    const best = scored[0];
    if (best && best.score >= 0.7) {
      return best.faq;
    }

    return null;
  }

  private calculateScore(
    faq: FAQ,
    tokens: string[],
    message: string
  ): number {
    let score = 0;

    // Match com keywords
    const keywordMatches = faq.keywords.filter(k =>
      message.includes(k.toLowerCase())
    );
    score += keywordMatches.length * 0.3;

    // Match com variacoes
    const variationMatch = faq.variations.some(v =>
      this.similarity(message, v.toLowerCase()) > 0.8
    );
    if (variationMatch) score += 0.5;

    // Match com pergunta principal
    const questionSimilarity = this.similarity(
      message,
      faq.question.toLowerCase()
    );
    score += questionSimilarity * 0.4;

    return Math.min(score, 1);
  }

  private similarity(a: string, b: string): number {
    // Implementacao de similaridade (Levenshtein, Jaccard, etc)
    // ...
  }
}
```

## Integracao com IA

### Fluxo de Uso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Mensagem do Cliente                                                       │
│   "Voces aceitam pix?"                                                      │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐                                                          │
│   │  Buscar     │                                                          │
│   │  FAQ Match  │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │ Match encontrado (score > 0.7)                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  FAQ:       │                                                          │
│   │  "Quais sao │                                                          │
│   │  as formas  │                                                          │
│   │  de paga... │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │ Adicionar ao contexto da IA                                     │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │   LLM gera  │                                                          │
│   │  resposta   │                                                          │
│   │  baseada na │                                                          │
│   │    FAQ      │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │ Incrementar aiUsageCount                                        │
│          ▼                                                                  │
│   "Sim! Aceitamos PIX. Alem disso, tambem trabalhamos com cartao de       │
│    credito, debito, boleto e transferencia..."                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Contexto para IA

```typescript
// FAQs sao adicionadas ao contexto do prompt
const faqContext = faqs.map(faq => `
Q: ${faq.question}
A: ${faq.answer}
`).join('\n\n');

const systemPrompt = `
Voce e um assistente de atendimento.

PERGUNTAS FREQUENTES (use estas respostas como referencia):

${faqContext}

Ao responder:
1. Se a pergunta corresponde a uma FAQ, use a resposta como base
2. Personalize a resposta para o contexto da conversa
3. Seja natural, nao copie literalmente
`;
```

## Respostas Rapidas para Agentes

### Painel de Respostas Rapidas

```
┌─────────────────────────────────────┐
│  Respostas Rapidas           [x]    │
├─────────────────────────────────────┤
│  [Buscar...]                        │
│                                     │
│  Mais usadas:                       │
│  ─────────────                      │
│  ┌─────────────────────────────┐    │
│  │ 💳 Formas de pagamento      │    │
│  │ "Aceitamos cartao, PIX..."  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🚚 Prazo de entrega         │    │
│  │ "O prazo varia de 3 a..."   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📦 Rastrear pedido          │    │
│  │ "Para rastrear, acesse..."  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Categorias:                        │
│  ─────────────                      │
│  [Financeiro] [Logistica]           │
│  [Comercial]  [Suporte]             │
│                                     │
└─────────────────────────────────────┘
```

### Insercao Rapida

Ao clicar em uma FAQ:

```typescript
// O agente pode:
// 1. Inserir resposta no campo de mensagem
onFAQSelect(faq: FAQ) {
  // Copia resposta para o campo de texto
  setMessageInput(faq.answer);

  // Incrementa contador de uso
  await api.post(`/faqs/${faq.id}/increment-usage`);
}

// 2. Editar antes de enviar
// 3. Personalizar com nome do cliente
const personalizedAnswer = faq.answer.replace(
  '{nome}',
  contact.name
);
```

## Metricas e Analytics

### Dashboard de FAQs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Metricas de FAQ                                         Periodo: [30 dias] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total FAQs   │  │ Usos por     │  │ Usos pela    │  │ Taxa de      │    │
│  │              │  │ Agentes      │  │ IA           │  │ Matching     │    │
│  │     35       │  │    2,345     │  │    1,234     │  │    78.5%     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Top 10 FAQs Mais Usadas                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Pergunta                                    Agentes    IA     Total   │ │
│  │ ────────────────────────────────────────────────────────────────────  │ │
│  │ 1. Formas de pagamento aceitas              456       234     690     │ │
│  │ 2. Prazo de entrega                         389       198     587     │ │
│  │ 3. Como rastrear pedido                     345       178     523     │ │
│  │ 4. Politica de devolucao                    234       156     390     │ │
│  │ 5. Horario de atendimento                   210       145     355     │ │
│  │ 6. Como cancelar pedido                     189       123     312     │ │
│  │ 7. Garantia dos produtos                    167       98      265     │ │
│  │ 8. Troca de produto                         145       89      234     │ │
│  │ 9. Primeira compra - desconto               134       78      212     │ │
│  │ 10. Frete gratis                            123       67      190     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  FAQs Sugeridas (baseado em perguntas sem match)                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Perguntas frequentes sem FAQ correspondente:                          │ │
│  │                                                                        │ │
│  │ • "como usar cupom de desconto" (45 ocorrencias)        [Criar FAQ]  │ │
│  │ • "vocês tem loja física" (32 ocorrencias)              [Criar FAQ]  │ │
│  │ • "como alterar endereco" (28 ocorrencias)              [Criar FAQ]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  FAQs Nunca Usadas (considerar remocao): 3                                  │
│  [Ver FAQs sem uso]                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Categorias

### Organizacao por Categorias

```
┌─────────────────────────────────────┐
│  Categorias de FAQ                  │
├─────────────────────────────────────┤
│                                     │
│  ▼ Financeiro (8 FAQs)              │
│    • Formas de pagamento            │
│    • Parcelamento                   │
│    • Nota fiscal                    │
│    • Estorno                        │
│    • ...                            │
│                                     │
│  ▼ Logistica (6 FAQs)               │
│    • Prazo de entrega               │
│    • Rastreamento                   │
│    • Frete gratis                   │
│    • ...                            │
│                                     │
│  ▼ Comercial (10 FAQs)              │
│    • Devolucao                      │
│    • Troca                          │
│    • Garantia                       │
│    • Desconto primeira compra       │
│    • ...                            │
│                                     │
│  ▼ Suporte (7 FAQs)                 │
│    • Horario atendimento            │
│    • Canais de contato              │
│    • ...                            │
│                                     │
│  ▼ Produtos (4 FAQs)                │
│    • Disponibilidade                │
│    • Especificacoes                 │
│    • ...                            │
│                                     │
│  [+ Nova Categoria]                 │
│                                     │
└─────────────────────────────────────┘
```

## Importacao e Exportacao

### Importar FAQs

```
┌─────────────────────────────────────┐
│  Importar FAQs                      │
├─────────────────────────────────────┤
│                                     │
│  Formato aceito: CSV, JSON          │
│                                     │
│  Template CSV:                      │
│  ┌─────────────────────────────┐    │
│  │ pergunta,resposta,keywords  │    │
│  │ categoria                   │    │
│  │ "Qual prazo?","3-5 dias"    │    │
│  │ "entrega,prazo","Logistica" │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Baixar Template]                  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Arrastar arquivo aqui ou           │
│  [Selecionar arquivo]               │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Opcoes:                            │
│  [ ] Sobrescrever existentes        │
│  [x] Ignorar duplicadas             │
│  [x] Validar antes de importar      │
│                                     │
│  [Cancelar]          [Importar]     │
│                                     │
└─────────────────────────────────────┘
```

### Exportar FAQs

```
┌─────────────────────────────────────┐
│  Exportar FAQs                      │
├─────────────────────────────────────┤
│                                     │
│  Formato:                           │
│  (●) CSV                            │
│  ( ) JSON                           │
│  ( ) Excel                          │
│                                     │
│  Filtros:                           │
│  Categoria: [Todas          ▼]      │
│  Status: [Todas             ▼]      │
│                                     │
│  Incluir:                           │
│  [x] Pergunta e resposta            │
│  [x] Keywords                       │
│  [x] Variacoes                      │
│  [ ] Metricas de uso                │
│                                     │
│  [Cancelar]          [Exportar]     │
│                                     │
└─────────────────────────────────────┘
```

## Casos de Uso

### 1. Resposta Rapida por Agente

**Cenario**: Cliente pergunta sobre pagamento.

```
1. Cliente: "Voces aceitam PIX?"
2. Agente abre painel de Respostas Rapidas
3. Busca ou encontra FAQ de pagamentos
4. Clica para inserir resposta
5. Personaliza se necessario
6. Envia resposta
7. usageCount incrementado
```

### 2. Resposta Automatica por IA

**Cenario**: IA atende automaticamente.

```
1. Cliente: "Quanto tempo demora a entrega?"
2. IA detecta pergunta sobre prazo
3. Busca FAQ com keyword "entrega"
4. Encontra match com score 0.85
5. Usa FAQ para gerar resposta natural
6. aiUsageCount incrementado
```

### 3. Identificacao de Gap

**Cenario**: Muitas perguntas sem match.

```
1. Analisa metricas de matching
2. Identifica "cupom de desconto" sem FAQ
3. Ve que apareceu 45 vezes no mes
4. Cria nova FAQ sobre cupons
5. Adiciona keywords relevantes
6. Taxa de matching melhora
```

### 4. Atualizacao de Politica

**Cenario**: Mudanca na politica de troca.

```
1. Empresa muda prazo de troca
2. Gestor edita FAQ de devolucao
3. Atualiza de "7 dias" para "30 dias"
4. IA passa a usar nova informacao
5. Agentes veem resposta atualizada
```

## FAQ vs Base de Conhecimento

### Quando Usar Cada Um

| Aspecto | FAQ | Base de Conhecimento |
|---------|-----|----------------------|
| **Tamanho** | Resposta curta (1-3 paragrafos) | Artigo longo (tutorial completo) |
| **Formato** | Pergunta e resposta | Documento estruturado |
| **Uso** | Respostas rapidas | Consulta detalhada |
| **IA** | Matching direto | Contexto adicional |
| **Exemplo** | "Qual o prazo?" | "Como configurar produto X" |

### Uso Complementar

```
Cliente: "Como devolver um produto?"

1. IA busca na FAQ:
   - Encontra resposta resumida sobre devolucao

2. Se cliente pede mais detalhes, IA busca Base de Conhecimento:
   - Encontra artigo completo com passo a passo
```

## Integracao com Outras Funcionalidades

### Chat

- Painel de respostas rapidas
- Insercao com um clique
- Personalizacao antes de enviar

### IA

- Matching automatico
- Contexto para respostas
- Metricas de uso

### Departamentos

- FAQs por departamento
- Visibilidade controlada
- Filtragem automatica

### Base de Conhecimento

- Complementares
- FAQ para respostas curtas
- KB para detalhes

## Boas Praticas

### Criacao de FAQs

1. **Perguntas reais** - Base em perguntas recebidas
2. **Respostas concisas** - Direto ao ponto
3. **Keywords relevantes** - Facilite o matching
4. **Variacoes** - Inclua formas alternativas
5. **Atualize regularmente** - Mantenha preciso

### Keywords

1. **Sinonimos** - Inclua diferentes formas
2. **Erros comuns** - Considere typos frequentes
3. **Termos tecnicos e populares** - "PIX" e "pix"
4. **Verbos** - "pagar", "pagamento", "pago"

### Organizacao

1. **Categorias claras** - Agrupe logicamente
2. **Evite duplicacao** - Uma FAQ por pergunta
3. **Revise metricas** - Remova FAQs sem uso
4. **Preencha gaps** - Crie FAQs para perguntas frequentes sem match

## Proximos Passos

- [Base de Conhecimento](/funcionalidades/base-conhecimento) - Artigos detalhados
- [Chat](/funcionalidades/chat) - Interface de atendimento
- [Notificacoes](/funcionalidades/notificacoes) - Alertas e lembretes
