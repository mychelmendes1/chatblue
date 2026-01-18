---
sidebar_position: 1
title: Configuracao Basica da IA
description: Aprenda os fundamentos da configuracao do assistente de IA no ChatBlue
---

# Configuracao Basica da IA

Este guia vai te ensinar os fundamentos para configurar o assistente de Inteligencia Artificial no ChatBlue. Ao final, voce tera a IA funcionando e respondendo seus clientes!

---

## O Que e o Assistente de IA?

O assistente de IA do ChatBlue e um **atendente virtual** que conversa com seus clientes de forma natural e inteligente. Ele usa tecnologia de ponta (como GPT-4 e Claude) para:

- **Responder perguntas** sobre seus produtos e servicos
- **Atender 24 horas** sem precisar de humanos de plantao
- **Filtrar atendimentos** passando para humanos apenas quando necessario
- **Manter contexto** lembrando do historico da conversa
- **Personalizar respostas** usando o nome do cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMO FUNCIONA A IA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Cliente envia         IA processa          IA responde        │
│   mensagem              e entende            naturalmente       │
│                                                                 │
│   ┌─────────┐          ┌─────────┐          ┌─────────┐        │
│   │ "Qual o │    →     │  GPT-4  │    →     │"O plano │        │
│   │ preco?" │          │ Claude  │          │ custa..." │        │
│   └─────────┘          └─────────┘          └─────────┘        │
│                                                                 │
│                    OU, se necessario:                           │
│                                                                 │
│                        ┌─────────────┐                          │
│                   →    │ Transfere   │                          │
│                        │ p/ humano   │                          │
│                        └─────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Beneficios de Usar a IA

### Para Sua Empresa

| Beneficio | Descricao |
|-----------|-----------|
| **Disponibilidade 24/7** | Atenda clientes a qualquer hora, mesmo de madrugada |
| **Reducao de Custos** | Menos atendentes necessarios para demandas simples |
| **Escalabilidade** | IA atende 100 clientes simultaneamente sem perder qualidade |
| **Consistencia** | Respostas sempre alinhadas com o padrao da empresa |
| **Dados e Insights** | Saiba o que seus clientes mais perguntam |

### Para Seus Clientes

| Beneficio | Descricao |
|-----------|-----------|
| **Resposta Instantanea** | Sem fila de espera para perguntas simples |
| **Atendimento Natural** | Conversa fluida, nao parece um robo |
| **Resolucao Rapida** | Muitas duvidas resolvidas em segundos |
| **Opcao de Humano** | Sempre pode pedir para falar com atendente |

### Para Sua Equipe

| Beneficio | Descricao |
|-----------|-----------|
| **Menos Repeticao** | IA responde perguntas frequentes |
| **Foco no Complexo** | Atendentes focam em casos que realmente precisam de humanos |
| **Pre-qualificacao** | IA coleta informacoes antes de transferir |
| **Apoio 24h** | Equipe pode descansar, IA cuida do basico |

---

## Acessando as Configuracoes de IA

### Requisitos

Antes de comecar, verifique se voce tem:

- [ ] Acesso de **Administrador** no ChatBlue
- [ ] Plano **PRO** ou **ENTERPRISE** (plano BASIC nao inclui IA)
- [ ] Chave de API do provedor (OpenAI ou Anthropic)

### Passo a Passo para Acessar

1. Faca login com sua conta de administrador
2. No menu lateral, clique em **Configuracoes** (icone de engrenagem)
3. Selecione **Inteligencia Artificial**
4. Voce vera o painel de configuracao da IA

:::tip Atalho Rapido
Voce tambem pode acessar digitando na barra de endereco: `/configuracoes/ia`
:::

---

## Configuracao Basica - Passo a Passo

### Passo 1: Habilitar a IA

No painel de configuracoes:

1. Localize a opcao **"IA Habilitada"**
2. Ative o botao de toggle
3. O status mudara para **"Ativa"**

```
┌──────────────────────────────────────┐
│  Inteligencia Artificial             │
├──────────────────────────────────────┤
│                                      │
│  IA Habilitada     [====●] Ativa     │
│                                      │
│  Status: Pronta para atender         │
│                                      │
└──────────────────────────────────────┘
```

### Passo 2: Escolher o Provedor

Selecione qual provedor de IA voce vai usar:

| Provedor | Melhor Para |
|----------|-------------|
| **OpenAI** | Uso geral, mais documentacao disponivel |
| **Anthropic** | Conversas longas, respostas mais cuidadosas |

:::info Qual Escolher?
Se e sua primeira vez configurando, recomendamos **OpenAI** pela facilidade. Veja mais detalhes em [Escolhendo o Provedor](/treinamento/ia/escolhendo-provedor).
:::

### Passo 3: Inserir Chave de API

1. Obtenha sua chave de API no site do provedor escolhido
2. Cole a chave no campo **"API Key"**
3. Clique em **"Validar Chave"**
4. Aguarde a confirmacao verde

```
┌──────────────────────────────────────┐
│  Credenciais                         │
├──────────────────────────────────────┤
│                                      │
│  Provedor: [OpenAI ▼]                │
│                                      │
│  API Key:                            │
│  ┌──────────────────────────────┐   │
│  │ sk-xxxxxxxxxxxxxxxxxxxxxxx   │   │
│  └──────────────────────────────┘   │
│                                      │
│  [Validar Chave]  ✓ Chave valida!   │
│                                      │
└──────────────────────────────────────┘
```

:::caution Seguranca da Chave
**NUNCA** compartilhe sua chave de API com ninguem! Ela da acesso direto a sua conta no provedor e pode gerar custos.
:::

### Passo 4: Selecionar o Modelo

Escolha qual modelo de IA sera usado:

**OpenAI:**
| Modelo | Caracteristica | Custo |
|--------|---------------|-------|
| GPT-4 Turbo | Mais inteligente, rapido | $$ |
| GPT-4 | Muito inteligente, mais lento | $$$ |
| GPT-3.5 Turbo | Rapido, mais economico | $ |

**Anthropic:**
| Modelo | Caracteristica | Custo |
|--------|---------------|-------|
| Claude 3 Opus | Mais inteligente | $$$ |
| Claude 3 Sonnet | Equilibrado | $$ |
| Claude 3 Haiku | Rapido e economico | $ |

:::tip Recomendacao
Para comecar, use **GPT-4 Turbo** ou **Claude 3 Sonnet**. Sao equilibrados entre qualidade e custo.
:::

### Passo 5: Configurar o Basico

Configure os parametros essenciais:

| Configuracao | O Que E | Valor Sugerido |
|--------------|---------|----------------|
| **Temperatura** | Criatividade (0 = rigido, 1 = criativo) | 0.7 |
| **Max Tokens** | Tamanho maximo da resposta | 500 |
| **Timeout** | Tempo max de espera por resposta | 30 segundos |

### Passo 6: Salvar e Ativar

1. Revise todas as configuracoes
2. Clique em **"Salvar Configuracoes"**
3. Aguarde a mensagem de confirmacao
4. A IA esta pronta!

---

## Testando a IA

Antes de colocar em producao, **sempre teste** sua configuracao!

### Metodo 1: Teste Interno

1. Va em **Configuracoes > IA > Testar**
2. Digite uma mensagem de teste
3. Veja a resposta da IA
4. Ajuste se necessario

```
┌──────────────────────────────────────┐
│  Testar IA                           │
├──────────────────────────────────────┤
│                                      │
│  Sua mensagem de teste:              │
│  ┌──────────────────────────────┐   │
│  │ Qual o horario de funciona-  │   │
│  │ mento de voces?              │   │
│  └──────────────────────────────┘   │
│                                      │
│  [Enviar Teste]                      │
│                                      │
│  Resposta da IA:                     │
│  ┌──────────────────────────────┐   │
│  │ Ola! Nosso horario de atendi-│   │
│  │ mento e de segunda a sexta,  │   │
│  │ das 9h as 18h. Posso ajudar  │   │
│  │ em mais alguma coisa?        │   │
│  └──────────────────────────────┘   │
│                                      │
│  Tempo: 1.2s | Tokens: 45 | $0.001  │
└──────────────────────────────────────┘
```

### Metodo 2: Teste Real (Sandbox)

1. Crie um numero de teste no WhatsApp
2. Inicie uma conversa com sua conexao
3. Veja como a IA responde de verdade
4. Teste varios cenarios

### O Que Testar

- [ ] Saudacoes ("Ola", "Bom dia")
- [ ] Perguntas sobre produtos/servicos
- [ ] Perguntas sobre precos
- [ ] Pedido de falar com humano
- [ ] Perguntas fora do escopo
- [ ] Mensagens em outros idiomas
- [ ] Audios (se transcricao estiver ativa)

---

## Checklist de Configuracao Basica

Use este checklist para garantir que nao esqueceu nada:

- [ ] IA habilitada
- [ ] Provedor selecionado (OpenAI ou Anthropic)
- [ ] Chave de API inserida e validada
- [ ] Modelo escolhido
- [ ] Temperatura configurada
- [ ] Max tokens definido
- [ ] Timeout configurado
- [ ] Configuracoes salvas
- [ ] Teste realizado com sucesso

---

## Comparativo: Fazer vs Nao Fazer

| Fazer | Nao Fazer |
|-------|-----------|
| Testar a IA antes de ativar em producao | Ativar direto sem testar |
| Comecar com configuracoes conservadoras | Mexer em tudo de uma vez |
| Monitorar os primeiros atendimentos | Deixar rodando sem acompanhar |
| Guardar a chave de API em local seguro | Compartilhar a chave com terceiros |
| Ajustar com base no feedback | Ignorar problemas reportados |

---

## Solucao de Problemas Comuns

### "Chave de API invalida"

**Causa:** A chave foi copiada incorretamente ou expirou.

**Solucao:**
1. Va ao site do provedor (OpenAI ou Anthropic)
2. Gere uma nova chave de API
3. Copie a chave completa (sem espacos extras)
4. Cole no ChatBlue e valide novamente

### "IA nao esta respondendo"

**Causa:** Pode ser configuracao ou problema de conexao.

**Solucao:**
1. Verifique se a IA esta habilitada
2. Confirme que a chave de API esta valida
3. Verifique se o ticket nao tem atendente (IA nao responde se tiver)
4. Teste no ambiente de teste interno

### "Respostas muito lentas"

**Causa:** Modelo muito pesado ou problemas de rede.

**Solucao:**
1. Troque para um modelo mais rapido (GPT-3.5, Haiku)
2. Reduza o max tokens
3. Verifique a conexao de internet do servidor

---

## Proximos Passos

Agora que sua IA esta configurada e funcionando, avance para:

1. **[Escolhendo o Provedor](/treinamento/ia/escolhendo-provedor)** - Entenda as diferencas entre OpenAI e Anthropic
2. **[Personalidade da IA](/treinamento/ia/personalidade)** - Configure como a IA deve se comportar
3. **[Base de Conhecimento](/treinamento/ia/base-conhecimento)** - Ensine a IA sobre sua empresa

---

:::tip Precisa de Ajuda?
Se encontrar dificuldades na configuracao, entre em contato com o suporte tecnico ou consulte a documentacao do provedor de IA escolhido.
:::
