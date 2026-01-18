---
sidebar_position: 7
title: Base de Conhecimento
description: Gerenciamento da base de conhecimento para suporte e IA
---

# Base de Conhecimento

A Base de Conhecimento do ChatBlue e um repositorio centralizado de informacoes que auxilia tanto os agentes humanos quanto a IA no atendimento aos clientes.

## Visao Geral

A funcionalidade oferece:

- **Artigos estruturados** para consulta rapida
- **Organizacao por categorias** e departamentos
- **Integracao com IA** para respostas automaticas
- **Busca avancada** por palavras-chave
- **Versionamento** de conteudo
- **Metricas de uso** e relevancia

## Interface do Usuario

### Lista de Artigos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Base de Conhecimento                            [+ Novo Artigo] [Filtros]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Buscar artigos...]                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Categorias                      Artigos                                     │
│  ─────────────                   ────────────────────────────────────────    │
│                                                                              │
│  ▼ Produtos                      ┌────────────────────────────────────────┐ │
│    ├─ Catalogo                   │ Como configurar o produto X            │ │
│    ├─ Precos                     │ Categoria: Produtos > Configuracao     │ │
│    └─ Configuracao               │ Tags: [config] [produto] [tutorial]    │ │
│                                  │ Visualizacoes: 245 | Usado pela IA: 89  │ │
│  ▼ Suporte Tecnico               └────────────────────────────────────────┘ │
│    ├─ Instalacao                                                            │
│    ├─ Erros Comuns               ┌────────────────────────────────────────┐ │
│    └─ FAQ Tecnico                │ Politica de devolucao                   │ │
│                                  │ Categoria: Comercial > Politicas        │ │
│  ▼ Comercial                     │ Tags: [devolucao] [reembolso] [prazo]  │ │
│    ├─ Politicas                  │ Visualizacoes: 567 | Usado pela IA: 234 │ │
│    └─ Promocoes                  └────────────────────────────────────────┘ │
│                                                                              │
│  ▼ Financeiro                    ┌────────────────────────────────────────┐ │
│    ├─ Pagamentos                 │ Formas de pagamento aceitas            │ │
│    └─ Notas Fiscais              │ Categoria: Financeiro > Pagamentos     │ │
│                                  │ Tags: [pagamento] [cartao] [pix]       │ │
│  [+ Nova Categoria]              │ Visualizacoes: 890 | Usado pela IA: 456 │ │
│                                  └────────────────────────────────────────┘ │
│                                                                              │
│                                  Mostrando 1-10 de 45 artigos               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Editor de Artigo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Novo Artigo                                          [Rascunho] [Publicar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Titulo:                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Como configurar o produto X                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Categoria:                           Departamento:                          │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐       │
│  │ Produtos > Configuracao  ▼ │     │ Suporte              ▼     │       │
│  └─────────────────────────────┘     └─────────────────────────────┘       │
│                                                                              │
│  Tags:                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [config] [produto] [tutorial] [passo-a-passo] [+]                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Conteudo:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [B] [I] [U] [Link] [Imagem] [Codigo] [Lista] [Tabela]                │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │ # Como configurar o produto X                                        │  │
│  │                                                                       │  │
│  │ Este artigo explica passo a passo como configurar o produto X.       │  │
│  │                                                                       │  │
│  │ ## Pre-requisitos                                                     │  │
│  │                                                                       │  │
│  │ - Produto X instalado                                                 │  │
│  │ - Acesso de administrador                                             │  │
│  │                                                                       │  │
│  │ ## Passo 1: Acessar configuracoes                                     │  │
│  │                                                                       │  │
│  │ 1. Abra o menu principal                                              │  │
│  │ 2. Clique em "Configuracoes"                                          │  │
│  │ 3. Selecione "Produto X"                                              │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Opcoes:                                                                     │
│  [x] Ativo (visivel para agentes)                                           │
│  [x] Disponivel para IA                                                     │
│  [ ] Destacar no topo                                                        │
│                                                                              │
│  [Cancelar]           [Visualizar]                            [Salvar]      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Estrutura do Artigo

```prisma
model KnowledgeBase {
  id           String   @id @default(uuid())
  companyId    String
  departmentId String?                      // Departamento especifico
  title        String                       // Titulo do artigo
  content      String                       // Conteudo em Markdown
  category     String?                      // Categoria/subcategoria
  tags         String[] @default([])        // Tags para busca
  order        Int      @default(0)         // Ordem de exibicao
  isActive     Boolean  @default(true)      // Se esta ativo
  isAIEnabled  Boolean  @default(true)      // Disponivel para IA
  viewCount    Int      @default(0)         // Visualizacoes
  aiUsageCount Int      @default(0)         // Vezes usado pela IA
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

### Estrutura de Categorias

```typescript
// Categorias sao hierarquicas usando notacao de caminho
{
  categories: [
    "Produtos",
    "Produtos > Catalogo",
    "Produtos > Precos",
    "Produtos > Configuracao",
    "Suporte Tecnico",
    "Suporte Tecnico > Instalacao",
    "Suporte Tecnico > Erros Comuns",
    "Comercial",
    "Comercial > Politicas",
    "Financeiro"
  ]
}
```

## Organizacao do Conteudo

### Hierarquia de Categorias

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              Base de Conhecimento                            │
│                                     │                                        │
│        ┌─────────────────┬──────────┴──────────┬─────────────────┐          │
│        │                 │                      │                 │          │
│   ┌────┴────┐       ┌────┴────┐           ┌────┴────┐       ┌────┴────┐     │
│   │Produtos │       │ Suporte │           │Comercial│       │Financeiro│    │
│   └────┬────┘       └────┬────┘           └────┬────┘       └────┬────┘     │
│        │                 │                      │                 │          │
│   ┌────┼────┐       ┌────┼────┐           ┌────┼────┐       ┌────┼────┐     │
│   │    │    │       │    │    │           │    │    │       │    │    │     │
│   ▼    ▼    ▼       ▼    ▼    ▼           ▼    ▼    ▼       ▼    ▼    ▼     │
│  Cat. Preco Config Inst. Erros FAQ      Polit.Promo        Pag. NF        │
│                                                                             │
│  Cada folha = multiplos artigos                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sistema de Tags

```
┌─────────────────────────────────────┐
│  Gerenciar Tags                     │
├─────────────────────────────────────┤
│                                     │
│  Tags mais usadas:                  │
│                                     │
│  [configuracao] 45 artigos          │
│  [tutorial] 38 artigos              │
│  [erro] 32 artigos                  │
│  [pagamento] 28 artigos             │
│  [instalacao] 25 artigos            │
│  [produto] 22 artigos               │
│  [faq] 20 artigos                   │
│  [politica] 18 artigos              │
│                                     │
│  [+ Criar Nova Tag]                 │
│                                     │
│  Sugestoes de tags similares:       │
│  - "config" → "configuracao"        │
│  - "setup" → "instalacao"           │
│                                     │
│  [Mesclar Tags Duplicadas]          │
│                                     │
└─────────────────────────────────────┘
```

## Integracao com IA

### Fluxo de Uso pela IA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Cliente Pergunta                                                          │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐                                                          │
│   │  IA Recebe  │                                                          │
│   │  Mensagem   │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐       ┌─────────────────────────────────────────────┐    │
│   │   Buscar    │──────►│  Base de Conhecimento                       │    │
│   │   Artigos   │       │                                             │    │
│   │  Relevantes │◄──────│  - Busca por keywords da mensagem          │    │
│   └──────┬──────┘       │  - Filtra por departamento do ticket       │    │
│          │              │  - Ordena por relevancia                    │    │
│          │              └─────────────────────────────────────────────┘    │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  Construir  │                                                          │
│   │  Contexto   │                                                          │
│   │  com Artigos│                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │   Gerar     │                                                          │
│   │  Resposta   │                                                          │
│   │  com LLM    │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │ Incrementar │                                                          │
│   │ aiUsageCount│                                                          │
│   └─────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Construcao de Contexto

```typescript
class ContextBuilderService {
  async buildKnowledgeContext(
    companyId: string,
    departmentId: string | null,
    userMessage: string
  ): Promise<string[]> {
    // 1. Extrair keywords da mensagem
    const keywords = this.extractKeywords(userMessage);

    // 2. Buscar artigos relevantes
    const articles = await prisma.knowledgeBase.findMany({
      where: {
        companyId,
        isActive: true,
        isAIEnabled: true,
        OR: [
          { departmentId: null },        // Artigos gerais
          { departmentId: departmentId } // Artigos do departamento
        ],
        OR: [
          { title: { contains: keywords, mode: 'insensitive' } },
          { content: { contains: keywords, mode: 'insensitive' } },
          { tags: { hasSome: keywords } }
        ]
      },
      orderBy: [
        { aiUsageCount: 'desc' },
        { viewCount: 'desc' }
      ],
      take: 5  // Top 5 mais relevantes
    });

    // 3. Formatar para contexto
    return articles.map(a => `
      ## ${a.title}
      ${a.content}
    `);
  }
}
```

### Prompt com Conhecimento

```typescript
// Exemplo de prompt enviado para LLM
const systemPrompt = `
Voce e um assistente de atendimento da empresa X.

BASE DE CONHECIMENTO:
${knowledgeContext.join('\n\n---\n\n')}

REGRAS:
1. Use APENAS as informacoes da base de conhecimento acima
2. Se a informacao nao estiver disponivel, diga que vai verificar
3. Cite a fonte quando relevante ("Conforme nossa politica...")
4. Seja preciso e evite inventar informacoes
`;
```

## Busca Avancada

### Interface de Busca

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Busca Avancada                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Termo de busca:                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ como configurar                                              [Buscar] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Filtros:                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Categoria   ▼   │  │ Departamento ▼  │  │ Tags        ▼   │             │
│  │ Todas           │  │ Todos           │  │ Todas          │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  [ ] Apenas ativos    [ ] Apenas para IA                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Resultados (5 encontrados):                                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ★ Como configurar o produto X                              Score: 95% │ │
│  │ ...passo a passo como **configurar** o produto X...                   │ │
│  │ Categoria: Produtos > Configuracao                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Configuracao inicial do sistema                            Score: 87% │ │
│  │ ...antes de **configurar** o sistema, certifique-se...                │ │
│  │ Categoria: Suporte Tecnico > Instalacao                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Algoritmo de Busca

```typescript
class KnowledgeSearchService {
  async search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    // 1. Tokenizar query
    const tokens = this.tokenize(query);

    // 2. Buscar com ranking
    const results = await prisma.$queryRaw`
      SELECT
        kb.*,
        ts_rank(
          to_tsvector('portuguese', kb.title || ' ' || kb.content),
          plainto_tsquery('portuguese', ${query})
        ) as score
      FROM "KnowledgeBase" kb
      WHERE
        kb."companyId" = ${filters.companyId}
        AND kb."isActive" = true
        AND (
          to_tsvector('portuguese', kb.title || ' ' || kb.content)
          @@ plainto_tsquery('portuguese', ${query})
          OR kb.tags && ${tokens}
        )
      ORDER BY score DESC
      LIMIT 10
    `;

    return results;
  }
}
```

## Versionamento

### Historico de Alteracoes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Historico - Como configurar o produto X                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Versao Atual: v5                                                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  v5 (Atual)        15/01/2024 10:30        Maria Santos               │ │
│  │  Alteracao: Adicionado passo sobre nova funcionalidade                │ │
│  │  [Ver] [Restaurar]                                                     │ │
│  │                                                                        │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  v4                 10/01/2024 14:15        Pedro Costa                │ │
│  │  Alteracao: Corrigido erro no passo 3                                 │ │
│  │  [Ver] [Restaurar] [Comparar com atual]                               │ │
│  │                                                                        │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  v3                 05/01/2024 09:00        Maria Santos               │ │
│  │  Alteracao: Adicionadas imagens ilustrativas                          │ │
│  │  [Ver] [Restaurar] [Comparar com atual]                               │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Metricas de Uso

### Dashboard de Metricas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Metricas da Base de Conhecimento                    Periodo: [30 dias ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total        │  │ Visualizacoes│  │ Uso pela IA  │  │ Buscas       │    │
│  │ Artigos      │  │   Totais     │  │              │  │              │    │
│  │     45       │  │    5,678     │  │    2,345     │  │    1,234     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Artigos Mais Visualizados                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Formas de pagamento aceitas                    890 visualizacoes   │ │
│  │ 2. Politica de devolucao                          567 visualizacoes   │ │
│  │ 3. Como rastrear meu pedido                       456 visualizacoes   │ │
│  │ 4. Horario de atendimento                         345 visualizacoes   │ │
│  │ 5. Como configurar o produto X                    245 visualizacoes   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Artigos Mais Usados pela IA                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Formas de pagamento aceitas                    456 usos            │ │
│  │ 2. Politica de devolucao                          234 usos            │ │
│  │ 3. Prazo de entrega                               189 usos            │ │
│  │ 4. Como cancelar pedido                           145 usos            │ │
│  │ 5. Garantia dos produtos                          123 usos            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Termos Mais Buscados                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ "pagamento" (234) | "entrega" (189) | "devolucao" (156) | "rastrear"  │ │
│  │ (145) | "cancelar" (123) | "garantia" (98) | "prazo" (87)             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Artigos sem Visualizacoes (ultimos 30 dias): 3                             │
│  [Ver artigos inativos]                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Casos de Uso

### 1. Atendimento com Apoio

**Cenario**: Agente precisa de informacao durante atendimento.

```
1. Cliente pergunta sobre politica de devolucao
2. Agente abre Base de Conhecimento
3. Busca "devolucao"
4. Encontra artigo com politica completa
5. Usa informacao para responder cliente
6. Artigo tem viewCount incrementado
```

### 2. IA Automatica

**Cenario**: IA responde automaticamente com base em conhecimento.

```
1. Cliente: "Quais formas de pagamento voces aceitam?"
2. IA busca artigos com "pagamento"
3. Encontra "Formas de pagamento aceitas"
4. Usa conteudo para gerar resposta
5. Cliente recebe resposta precisa
6. aiUsageCount incrementado
```

### 3. Criacao de Conteudo

**Cenario**: Equipe identifica gap de conhecimento.

```
1. Analisa termos buscados sem resultados
2. Identifica "troca de produto" sem artigo
3. Cria novo artigo sobre trocas
4. Adiciona tags relevantes
5. Habilita para uso pela IA
6. Monitora metricas de uso
```

### 4. Atualizacao de Politicas

**Cenario**: Empresa muda politica comercial.

```
1. Gestor acessa artigo de devolucao
2. Atualiza prazo de 7 para 30 dias
3. Sistema cria nova versao
4. Artigo atualizado imediatamente
5. IA passa a usar nova informacao
6. Versao anterior disponivel no historico
```

## Integracao com Outras Funcionalidades

### Chat

- Agentes podem consultar durante atendimento
- Botao de busca rapida na interface
- Sugestoes baseadas no contexto

### IA

- Artigos alimentam contexto da IA
- Metricas de uso pela IA
- Flag para controlar disponibilidade

### Departamentos

- Artigos podem ser especificos
- Filtragem por departamento
- Visibilidade controlada

### FAQ

- Base de Conhecimento para artigos longos
- FAQ para respostas curtas
- Complementares, nao duplicados

## Boas Praticas

### Criacao de Conteudo

1. **Titulos claros** - Descreva o que o artigo resolve
2. **Estrutura consistente** - Use templates
3. **Linguagem simples** - Evite jargoes
4. **Passo a passo** - Instrucoes claras
5. **Atualize regularmente** - Revise periodicamente

### Organizacao

1. **Categorias logicas** - Agrupe por tema
2. **Tags uteis** - Facilite a busca
3. **Evite duplicacao** - Um artigo por tema
4. **Hierarquia clara** - Maximo 3 niveis

### Para IA

1. **Informacoes factuais** - Dados precisos
2. **Respostas completas** - Evite "consulte X"
3. **Formatacao estruturada** - Facilita extracao
4. **Revisao frequente** - Garanta precisao

## Proximos Passos

- [FAQ](/funcionalidades/faq) - Perguntas frequentes
- [Chat](/funcionalidades/chat) - Interface de atendimento
- [Usuarios](/funcionalidades/usuarios) - Controle de acesso
