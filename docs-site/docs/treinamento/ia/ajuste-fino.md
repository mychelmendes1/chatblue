---
sidebar_position: 5
title: Ajuste Fino da IA
description: Otimize o comportamento da IA com triggers, guardrails e monitoramento
---

# Ajuste Fino da IA

Apos a configuracao inicial, o proximo passo e **refinar** o comportamento da IA. Este guia ensina como configurar triggers de transferencia, guardrails de seguranca e como monitorar e melhorar continuamente.

---

## Visao Geral do Ajuste Fino

O ajuste fino e um processo continuo de otimizacao:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE AJUSTE FINO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ┌─────────────┐                                         │
│         │  CONFIGURAR │                                         │
│         │   triggers  │                                         │
│         │  guardrails │                                         │
│         └──────┬──────┘                                         │
│                │                                                │
│                ▼                                                │
│         ┌─────────────┐        ┌─────────────┐                  │
│         │  MONITORAR  │───────▶│  ANALISAR   │                  │
│         │  conversas  │        │  metricas   │                  │
│         └─────────────┘        └──────┬──────┘                  │
│                ▲                      │                         │
│                │                      ▼                         │
│                │               ┌─────────────┐                  │
│                └───────────────│   AJUSTAR   │                  │
│                                │configuracoes│                  │
│                                └─────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Triggers de Transferencia

Triggers sao palavras, frases ou situacoes que fazem a IA transferir automaticamente para um atendente humano.

### Tipos de Triggers

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| **Palavra-chave** | Palavra especifica | "cancelar", "advogado" |
| **Frase** | Combinacao de palavras | "falar com atendente" |
| **Sentimento** | Detecta emocao | Cliente irritado |
| **Repeticao** | Mesma pergunta varias vezes | 3 perguntas sem resolver |
| **Tempo** | Conversa muito longa | Mais de 10 mensagens |
| **Assunto** | Tema especifico | Reclamacao formal |

### Configurando Triggers

1. Va em **Configuracoes > IA > Transferencia**
2. Clique em **"+ Novo Trigger"**
3. Configure o tipo e a condicao
4. Defina a acao (transferir, notificar, etc.)
5. Salve

```
┌──────────────────────────────────────────────────────────────┐
│  Configurar Trigger                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Nome do Trigger:                                            │
│  ┌────────────────────────────────────────┐                 │
│  │ Cliente quer cancelar                   │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  Tipo: [Palavra-chave ▼]                                    │
│                                                              │
│  Palavras (uma por linha):                                  │
│  ┌────────────────────────────────────────┐                 │
│  │ cancelar                                │                 │
│  │ cancelamento                            │                 │
│  │ quero cancelar                          │                 │
│  │ desistir                                │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  Acao: [Transferir para humano ▼]                           │
│                                                              │
│  Departamento: [Retencao ▼]                                 │
│                                                              │
│  Mensagem antes de transferir:                              │
│  ┌────────────────────────────────────────┐                 │
│  │ Entendo que voce deseja cancelar.      │                 │
│  │ Vou te transferir para um especialista │                 │
│  │ que pode te ajudar melhor. Um momento! │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  [Cancelar]                        [Salvar Trigger]         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Triggers Recomendados

#### Nivel 1: Essenciais

| Trigger | Palavras | Acao |
|---------|----------|------|
| **Falar com Humano** | atendente, humano, pessoa real, falar com alguem | Transferir |
| **Reclamacao** | reclamacao, procon, processo, advogado | Transferir |
| **Cancelamento** | cancelar, cancelamento, desistir | Transferir |
| **Problemas Graves** | nao funciona, quebrado, defeito | Transferir |

#### Nivel 2: Recomendados

| Trigger | Palavras | Acao |
|---------|----------|------|
| **Elogio** | parabens, excelente, otimo atendimento | Notificar supervisor |
| **Urgencia** | urgente, emergencia, agora | Priorizar |
| **Financeiro** | reembolso, cobranca indevida, estorno | Transferir |
| **Tecnico Avancado** | erro sistema, bug, nao carrega | Transferir suporte |

#### Nivel 3: Opcionais

| Trigger | Condicao | Acao |
|---------|----------|------|
| **Repeticao** | Mesma pergunta 3+ vezes | Transferir |
| **Tempo Longo** | 15+ mensagens sem resolver | Transferir |
| **Sentimento Negativo** | 3+ mensagens irritadas | Notificar |
| **Horario Comercial** | Durante expediente | Oferecer humano |

---

## Guardrails de Seguranca

Guardrails sao **limites** que impedem a IA de fazer ou dizer coisas inadequadas.

### Tipos de Guardrails

| Tipo | O Que Faz | Exemplo |
|------|-----------|---------|
| **Palavras Proibidas** | Bloqueia termos especificos | Concorrentes, palavroes |
| **Topicos Restritos** | Evita certos assuntos | Politica, religiao |
| **Limite de Promessas** | Impede compromissos | "Garantimos 100%" |
| **Dados Sensiveis** | Protege informacoes | CPF, senhas |
| **Acoes Bloqueadas** | Impede certas acoes | Dar descontos nao autorizados |

### Configurando Guardrails

1. Va em **Configuracoes > IA > Guardrails**
2. Ative os guardrails desejados
3. Configure os parametros
4. Teste antes de ativar

### Guardrails Essenciais

#### 1. Palavras Proibidas

```
┌──────────────────────────────────────────────────────────────┐
│  Palavras Proibidas                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  A IA nunca usara estas palavras nas respostas:             │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ [Concorrente A] [Concorrente B]        │                 │
│  │ [garantimos] [prometemos]              │                 │
│  │ [com certeza vai] [impossivel]         │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  [+ Adicionar palavra]                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 2. Topicos Restritos

Configure topicos que a IA deve evitar ou redirecionar:

| Topico | Comportamento |
|--------|---------------|
| Politica | "Prefiro nao opinar sobre isso. Posso ajudar com nossos produtos?" |
| Religiao | Redirecionar para o assunto principal |
| Concorrentes | Nao comentar, focar nos proprios produtos |
| Informacoes internas | "Essa informacao e confidencial." |

#### 3. Limite de Compromissos

Impeca a IA de fazer promessas que nao pode cumprir:

| Bloquear | Alternativa |
|----------|-------------|
| "Garanto que vai funcionar" | "Nosso produto foi desenvolvido para..." |
| "Voce recebera amanha" | "O prazo estimado e de X dias" |
| "Posso dar 50% de desconto" | "Deixe-me verificar promocoes disponiveis" |

#### 4. Protecao de Dados

Configure para a IA nunca pedir ou armazenar:

- [ ] Senhas
- [ ] Numeros de cartao completos
- [ ] CVV
- [ ] Dados bancarios via chat
- [ ] Documentos pessoais (CPF, RG)

---

## Testando e Iterando

### Processo de Teste

```
┌──────────────────────────────────────────────────────────────┐
│                    PROCESSO DE TESTE                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CRIAR CENARIOS                                           │
│     Liste situacoes a testar                                 │
│                                                              │
│  2. EXECUTAR TESTES                                          │
│     Simule conversas de clientes                             │
│                                                              │
│  3. AVALIAR RESULTADOS                                       │
│     A IA agiu como esperado?                                 │
│                                                              │
│  4. AJUSTAR CONFIGURACOES                                    │
│     Corrija problemas encontrados                            │
│                                                              │
│  5. REPETIR                                                  │
│     Teste novamente ate estar satisfeito                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Cenarios de Teste

Teste estes cenarios antes de ir para producao:

| Cenario | O Que Testar | Resultado Esperado |
|---------|--------------|-------------------|
| Saudacao | "Ola, bom dia" | Cumprimento cordial |
| Pergunta simples | "Qual o horario?" | Resposta correta |
| Pergunta complexa | Duvida tecnica | Resposta ou transferencia |
| Cliente irritado | "Estou muito insatisfeito!" | Empatia + oferecer humano |
| Pedido de humano | "Quero falar com pessoa" | Transferencia imediata |
| Cancelamento | "Quero cancelar" | Transferir para retencao |
| Fora do escopo | "Qual a capital da Franca?" | Redirecionar educadamente |
| Palavrao | Mensagem ofensiva | Manter profissionalismo |
| Dados sensiveis | "Minha senha e 1234" | Nao armazenar, orientar |

### Checklist de Testes

Antes de ativar em producao:

- [ ] Saudacoes funcionam bem
- [ ] Perguntas frequentes sao respondidas
- [ ] Triggers de transferencia funcionam
- [ ] Guardrails estao bloqueando corretamente
- [ ] Tom de voz esta adequado
- [ ] Informacoes estao corretas
- [ ] Situacoes de erro sao tratadas
- [ ] 5+ pessoas diferentes testaram

---

## Monitorando a Performance

### Metricas Principais

| Metrica | O Que Mede | Meta Sugerida |
|---------|------------|---------------|
| **Taxa de Resolucao** | % resolvido pela IA | > 60% |
| **Taxa de Transferencia** | % transferido para humano | < 40% |
| **Satisfacao (CSAT)** | Nota do atendimento | > 4.0/5.0 |
| **Tempo de Resposta** | Segundos para responder | < 3s |
| **Custo por Atendimento** | Gasto com API | Depende do volume |

### Dashboard de Monitoramento

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard de IA                                    Hoje | Semana │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │    847     │  │    72%     │  │    28%     │  │    4.3     │ │
│  │ Mensagens  │  │ Resolvidas │  │Transferidas│  │   CSAT     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                                                                  │
│  Principais Motivos de Transferencia:                           │
│  ├── Cliente pediu humano (45%)                                 │
│  ├── Cancelamento (25%)                                         │
│  ├── Reclamacao (15%)                                           │
│  └── Outros (15%)                                               │
│                                                                  │
│  Perguntas Mais Frequentes:                                     │
│  1. "Qual o prazo de entrega?" (156 vezes)                     │
│  2. "Como rastreio meu pedido?" (98 vezes)                     │
│  3. "Posso trocar o produto?" (87 vezes)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Revisao de Conversas

Reserve tempo para revisar conversas regularmente:

| Frequencia | O Que Revisar |
|------------|---------------|
| Diario | Transferencias e reclamacoes |
| Semanal | Amostra aleatoria de 20 conversas |
| Mensal | Analise completa de metricas |

### Identificando Problemas

| Sintoma | Possivel Causa | Solucao |
|---------|---------------|---------|
| Muitas transferencias | Falta artigos na base | Criar mais conteudo |
| Respostas erradas | Base desatualizada | Atualizar informacoes |
| Cliente insatisfeito | Tom inadequado | Ajustar personalidade |
| Respostas lentas | Modelo muito pesado | Trocar para modelo mais leve |
| Custo alto | Contexto muito longo | Limitar historico |

---

## Ajustes Comuns

### Problema: IA Transferindo Demais

**Sintoma:** Taxa de transferencia > 50%

**Solucoes:**
1. Revise os triggers - estao muito sensiveis?
2. Adicione mais artigos a base de conhecimento
3. Melhore o system prompt com mais instrucoes
4. Treine para casos que estao sendo transferidos

### Problema: IA Nao Transfere Quando Deveria

**Sintoma:** Clientes reclamam que nao conseguem humano

**Solucoes:**
1. Adicione mais triggers de transferencia
2. Torne os triggers existentes mais abrangentes
3. Adicione sinonimos as palavras-chave
4. Configure deteccao de sentimento

### Problema: Respostas Genericas Demais

**Sintoma:** IA responde de forma vaga

**Solucoes:**
1. Adicione mais detalhes a base de conhecimento
2. Inclua exemplos especificos nos artigos
3. Reduza a temperatura (mais focado)
4. Melhore o system prompt

### Problema: Respostas Muito Longas

**Sintoma:** Mensagens muito extensas

**Solucoes:**
1. Reduza o max tokens
2. Instrua no prompt para ser conciso
3. Configure estilo "conciso" na personalidade
4. Divida artigos longos em menores

### Problema: Tom Inadequado

**Sintoma:** IA muito formal ou informal

**Solucoes:**
1. Ajuste configuracoes de formalidade
2. Revise o system prompt
3. Adicione exemplos do tom desejado
4. Teste diferentes temperaturas

---

## Boas Praticas de Ajuste

| Fazer | Nao Fazer |
|-------|-----------|
| Mudar uma coisa por vez | Alterar tudo de uma vez |
| Testar antes de ativar | Ativar mudancas sem testar |
| Documentar alteracoes | Mudar sem registrar |
| Monitorar apos mudancas | Fazer mudanca e esquecer |
| Basear em dados | Mudar por "achismo" |
| Ouvir feedback da equipe | Ignorar quem usa diariamente |

---

## Ciclo de Melhoria Continua

### Processo Semanal

1. **Segunda:** Revisar metricas da semana anterior
2. **Terca:** Analisar conversas transferidas
3. **Quarta:** Identificar gaps na base de conhecimento
4. **Quinta:** Implementar melhorias
5. **Sexta:** Testar mudancas

### Processo Mensal

1. Analise completa de metricas
2. Reuniao com equipe de atendimento
3. Revisao de toda a base de conhecimento
4. Ajuste de triggers e guardrails
5. Planejamento de melhorias do proximo mes

---

## Checklist de Ajuste Fino

### Triggers
- [ ] Triggers de transferencia configurados
- [ ] Palavras-chave abrangentes
- [ ] Testados e funcionando
- [ ] Mensagens de transferencia personalizadas

### Guardrails
- [ ] Palavras proibidas configuradas
- [ ] Topicos restritos definidos
- [ ] Protecao de dados ativa
- [ ] Limites de compromisso configurados

### Monitoramento
- [ ] Dashboard configurado
- [ ] Metricas sendo acompanhadas
- [ ] Processo de revisao definido
- [ ] Equipe treinada para feedback

### Processo
- [ ] Ciclo de melhoria definido
- [ ] Responsaveis designados
- [ ] Documentacao de mudancas
- [ ] Testes antes de producao

---

## Proximos Passos

Apos configurar o ajuste fino:

1. **[Boas Praticas de Comunicacao](/treinamento/boas-praticas/comunicacao)** - Melhore a qualidade geral
2. **[FAQ](/treinamento/faq)** - Perguntas frequentes sobre o sistema

---

:::tip Lembre-se
O ajuste fino nunca acaba! A IA precisa evoluir junto com seu negocio. Reserve tempo toda semana para revisar e melhorar.
:::
