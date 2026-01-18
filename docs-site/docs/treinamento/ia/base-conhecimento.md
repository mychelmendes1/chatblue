---
sidebar_position: 4
title: Base de Conhecimento
description: Como criar e gerenciar a base de conhecimento para a IA
---

# Base de Conhecimento para a IA

A Base de Conhecimento e o "cerebro" da sua IA. E onde voce ensina informacoes especificas sobre sua empresa, produtos e servicos. Uma boa base de conhecimento transforma a IA de generica em especialista no seu negocio.

---

## O Que e a Base de Conhecimento?

A base de conhecimento e uma colecao de **artigos** que a IA consulta para responder perguntas. Pense nela como um manual interno que a IA le antes de responder.

```
┌─────────────────────────────────────────────────────────────────┐
│                 COMO A IA USA A BASE DE CONHECIMENTO            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Cliente pergunta:              IA consulta a base:            │
│   "Qual o prazo de              ┌─────────────────┐            │
│    entrega?"                    │ Artigo: Prazos  │            │
│         │                       │ de Entrega      │            │
│         │                       │                 │            │
│         ▼                       │ "O prazo varia  │            │
│   ┌───────────┐                │ de 3 a 7 dias   │            │
│   │    IA     │────busca──────▶│ uteis..."       │            │
│   └───────────┘                └─────────────────┘            │
│         │                                                       │
│         │                                                       │
│         ▼                                                       │
│   Responde ao cliente                                           │
│   com informacao precisa                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Beneficios

| Sem Base de Conhecimento | Com Base de Conhecimento |
|--------------------------|--------------------------|
| IA inventa informacoes | IA responde com precisao |
| Respostas genericas | Respostas especificas do seu negocio |
| Dados desatualizados | Informacoes sempre atuais |
| Inconsistencia | Padronizacao nas respostas |

---

## Acessando a Base de Conhecimento

1. Va em **Configuracoes > Inteligencia Artificial**
2. Clique na aba **Base de Conhecimento**
3. Voce vera a lista de artigos existentes

```
┌──────────────────────────────────────────────────────────────────┐
│  Base de Conhecimento                         [+ Novo Artigo]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Categorias          Artigos                                     │
│  ─────────────       ────────────────────────────────────        │
│                                                                  │
│  [Todos]             ┌────────────────────────────────────┐     │
│  [Produtos]          │ Politica de Trocas                 │     │
│  [Entregas]          │ Como funciona a troca de produtos  │     │
│  [Pagamentos]        │ Categoria: Politicas | Ativo       │     │
│  [Politicas]         └────────────────────────────────────┘     │
│  [Suporte]                                                       │
│                      ┌────────────────────────────────────┐     │
│                      │ Prazos de Entrega                  │     │
│                      │ Informacoes sobre prazos           │     │
│                      │ Categoria: Entregas | Ativo        │     │
│                      └────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Criando Artigos

### Estrutura de um Artigo

Cada artigo tem os seguintes campos:

| Campo | Descricao | Obrigatorio |
|-------|-----------|-------------|
| **Titulo** | Nome do artigo (usado na busca) | Sim |
| **Categoria** | Agrupamento por tema | Sim |
| **Conteudo** | Texto com as informacoes | Sim |
| **Palavras-chave** | Termos para melhorar a busca | Nao |
| **Status** | Ativo ou inativo | Sim |

### Passo a Passo

1. Clique em **"+ Novo Artigo"**
2. Preencha o titulo (seja descritivo!)
3. Selecione ou crie uma categoria
4. Escreva o conteudo
5. Adicione palavras-chave relevantes
6. Clique em **"Salvar"**

### Exemplo de Artigo Bem Escrito

```markdown
TITULO: Politica de Trocas e Devolucoes

CATEGORIA: Politicas

PALAVRAS-CHAVE: troca, devolucao, devolver, trocar, arrependimento,
defeito, produto errado, tamanho errado

CONTEUDO:

# Politica de Trocas e Devolucoes

## Prazo para Troca
- Voce tem ate 30 dias apos o recebimento para solicitar troca
- Para produtos com defeito, o prazo e de 90 dias

## Como Solicitar
1. Acesse "Minha Conta" no site
2. Va em "Meus Pedidos"
3. Selecione o pedido e clique em "Trocar/Devolver"
4. Escolha o motivo
5. Agende a coleta ou envie pelos Correios

## Custos
- Troca por defeito: GRATIS
- Troca por arrependimento: Frete por conta do cliente
- Troca por tamanho: Primeira troca GRATIS

## Reembolso
- Cartao: Estorno em ate 2 faturas
- PIX/Boleto: Devolucao em ate 10 dias uteis
- O valor e creditado apos recebermos o produto

## Produtos Nao Trocaveis
- Produtos personalizados
- Produtos de higiene pessoal abertos
- Produtos com lacre violado
```

---

## Escrevendo Artigos Eficazes

### Dicas de Escrita

| Fazer | Nao Fazer |
|-------|-----------|
| Ser direto e objetivo | Textos muito longos |
| Usar topicos e listas | Paragrafos extensos |
| Incluir numeros e dados | Informacoes vagas |
| Atualizar regularmente | Deixar dados desatualizados |
| Usar linguagem simples | Jargoes tecnicos |
| Cobrir perguntas frequentes | Ignorar duvidas comuns |

### Estrutura Recomendada

```
┌──────────────────────────────────────────────────────────────┐
│                ESTRUTURA DE UM BOM ARTIGO                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TITULO CLARO                                             │
│     "Como fazer X" ou "Politica de Y"                        │
│                                                              │
│  2. RESUMO (1-2 frases)                                      │
│     Resposta direta a pergunta principal                     │
│                                                              │
│  3. DETALHES                                                 │
│     Informacoes completas organizadas                        │
│                                                              │
│  4. PASSOS (se aplicavel)                                    │
│     Instrucoes numeradas                                     │
│                                                              │
│  5. EXCECOES                                                 │
│     Casos especiais ou restricoes                            │
│                                                              │
│  6. CONTATO                                                  │
│     O que fazer se precisar de mais ajuda                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Exemplo: Antes e Depois

**Antes (Ruim):**
```
Entrega
Entregamos em todo Brasil. O prazo depende.
```

**Depois (Bom):**
```
# Prazos de Entrega

## Resumo
Entregamos para todo o Brasil. O prazo varia de 3 a 15 dias
uteis dependendo da regiao.

## Prazos por Regiao
- Sudeste: 3-5 dias uteis
- Sul: 4-6 dias uteis
- Centro-Oeste: 5-8 dias uteis
- Nordeste: 7-12 dias uteis
- Norte: 10-15 dias uteis

## Rastreamento
Voce recebe o codigo de rastreio por email assim que
o pedido e despachado. Use o codigo no site dos Correios.

## Atrasos
Em caso de atraso, entre em contato pelo chat que
verificamos o status com a transportadora.
```

---

## Organizando por Categoria

### Categorias Sugeridas

Crie categorias que facam sentido para seu negocio:

| Categoria | O Que Incluir |
|-----------|---------------|
| **Produtos** | Informacoes sobre cada produto/servico |
| **Precos** | Tabelas de preco, planos, descontos |
| **Entregas** | Prazos, frete, rastreamento |
| **Pagamentos** | Formas de pagamento, parcelamento |
| **Trocas** | Politica de troca e devolucao |
| **Garantia** | Termos de garantia |
| **Conta** | Cadastro, senha, dados pessoais |
| **Suporte** | Problemas tecnicos, tutoriais |
| **Empresa** | Sobre nos, localizacao, horarios |

### Organizacao Visual

```
Base de Conhecimento
│
├── Produtos
│   ├── Catalogo de Produtos
│   ├── Especificacoes Tecnicas
│   └── Disponibilidade
│
├── Comercial
│   ├── Precos e Planos
│   ├── Promocoes Vigentes
│   └── Cupons de Desconto
│
├── Logistica
│   ├── Prazos de Entrega
│   ├── Areas Atendidas
│   └── Rastreamento
│
├── Financeiro
│   ├── Formas de Pagamento
│   ├── Parcelamento
│   └── Reembolsos
│
├── Politicas
│   ├── Trocas e Devolucoes
│   ├── Garantia
│   └── Privacidade
│
└── Institucional
    ├── Sobre a Empresa
    ├── Contato
    └── Horario de Funcionamento
```

---

## Configurando FAQs

O FAQ (Perguntas Frequentes) e uma secao especial da base de conhecimento focada nas duvidas mais comuns.

### Criando FAQs

1. Analise as conversas mais frequentes
2. Identifique as perguntas que mais se repetem
3. Crie artigos com respostas diretas
4. Marque como FAQ

### Exemplos de FAQs

```
PERGUNTA: Qual o prazo de entrega?
RESPOSTA: O prazo varia de 3 a 15 dias uteis dependendo da
sua regiao. Sudeste: 3-5 dias, Sul: 4-6 dias, demais regioes:
7-15 dias.

---

PERGUNTA: Posso parcelar minha compra?
RESPOSTA: Sim! Aceitamos parcelamento em ate 12x no cartao.
Compras acima de R$ 100 podem ser parceladas. Juros a partir
da 4a parcela.

---

PERGUNTA: Como rastreio meu pedido?
RESPOSTA: Voce recebe o codigo de rastreio por email quando
o pedido e despachado. Use esse codigo no site dos Correios
(www.correios.com.br) para acompanhar.

---

PERGUNTA: Voces entregam no meu endereco?
RESPOSTA: Entregamos em todo o Brasil! O frete e calculado
automaticamente no carrinho com base no seu CEP.
```

---

## Como a IA Usa a Base

### Processo de Busca

Quando um cliente faz uma pergunta:

1. **IA analisa a pergunta** - Identifica o tema
2. **Busca na base** - Procura artigos relevantes
3. **Seleciona os melhores** - Ordena por relevancia
4. **Combina informacoes** - Cria resposta completa
5. **Formata a resposta** - Adapta ao tom configurado

### Melhorando a Busca

Para a IA encontrar os artigos certos:

| Dica | Exemplo |
|------|---------|
| Use palavras-chave variadas | troca, trocar, devolucao, devolver |
| Inclua sinonimos | entrega, envio, despacho |
| Pense como o cliente | "quanto custa" vs "precos" |
| Atualize termos novos | PIX, quando lancado |

---

## Atualizando Informacoes

### Quando Atualizar

| Situacao | Acao |
|----------|------|
| Promocao nova | Criar/atualizar artigo de promocoes |
| Preco mudou | Atualizar artigo de precos |
| Novo produto | Criar artigo do produto |
| Politica alterada | Atualizar artigo de politicas |
| Feedback de erro | Corrigir imediatamente |

### Processo de Atualizacao

1. Localize o artigo a ser atualizado
2. Clique em **"Editar"**
3. Faca as alteracoes necessarias
4. Revise as informacoes
5. Clique em **"Salvar"**
6. A IA usara a nova versao imediatamente

:::tip Historico
O sistema guarda historico de alteracoes. Voce pode ver versoes anteriores se precisar voltar atras.
:::

---

## Checklist da Base de Conhecimento

### Artigos Essenciais

Certifique-se de ter artigos sobre:

- [ ] Informacoes de contato e horarios
- [ ] Principais produtos/servicos
- [ ] Precos e formas de pagamento
- [ ] Prazos de entrega
- [ ] Politica de trocas e devolucoes
- [ ] Garantia
- [ ] Como rastrear pedidos
- [ ] Perguntas mais frequentes (top 10)
- [ ] Como falar com um humano

### Qualidade dos Artigos

Para cada artigo, verifique:

- [ ] Titulo claro e descritivo
- [ ] Informacoes atualizadas
- [ ] Linguagem simples
- [ ] Palavras-chave adicionadas
- [ ] Categoria correta
- [ ] Revisado por erros

---

## Fazer vs Nao Fazer

| Fazer | Nao Fazer |
|-------|-----------|
| Atualizar quando algo muda | Deixar informacoes desatualizadas |
| Escrever pensando no cliente | Usar linguagem tecnica interna |
| Incluir detalhes importantes | Ser vago demais |
| Organizar por categorias logicas | Misturar temas no mesmo artigo |
| Testar se a IA encontra | Criar artigo e esquecer |
| Revisar periodicamente | Assumir que esta tudo certo |

---

## Metricas da Base de Conhecimento

Acompanhe como sua base esta sendo usada:

| Metrica | O Que Indica |
|---------|--------------|
| **Artigos mais acessados** | Quais temas sao mais procurados |
| **Buscas sem resultado** | Artigos que faltam criar |
| **Taxa de transferencia** | Se a base esta completa |
| **Feedback negativo** | Artigos que precisam melhorar |

---

## Proximos Passos

Agora que sua base de conhecimento esta configurada:

1. **[Ajuste Fino](/treinamento/ia/ajuste-fino)** - Otimize triggers e guardrails
2. **[FAQ do Sistema](/treinamento/faq)** - Perguntas frequentes

---

:::info Dica de Manutencao
Agende uma revisao mensal da base de conhecimento. Verifique se as informacoes estao atualizadas e adicione novos artigos baseado nas perguntas frequentes.
:::
