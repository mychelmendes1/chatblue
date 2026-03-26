---
sidebar_position: 17
title: NPS e Avaliacao
description: Net Promoter Score e avaliacao de atendimento no ChatBlue
---

# NPS e Avaliacao

O ChatBlue possui dois mecanismos complementares de feedback do cliente: **Avaliacao por estrelas** (rating 1-5) e **NPS - Net Promoter Score** (nota 0-10). Ambos sao coletados via links publicos enviados ao cliente apos a resolucao ou fechamento de um ticket.

## Visao Geral

```
Ticket resolvido/fechado
        |
        v
+-------------------+     +-------------------+
| Link de Avaliacao |     | Link de NPS       |
| /rate/:token      |     | /nps/:token       |
| (1-5 estrelas)    |     | (0-10 pontos)     |
+-------------------+     +-------------------+
        |                         |
        v                         v
  ticket.rating            ticket.npsScore
  ticket.ratingComment     ticket.npsComment
  ticket.ratedAt           ticket.npsRatedAt
```

### Caracteristicas

- Links **publicos** — nao exigem autenticacao do cliente
- Cada ticket gera tokens unicos (`ratingToken` e `npsToken`) para garantir seguranca
- O cliente so pode avaliar **uma vez** por token (idempotencia)
- Os dados ficam armazenados diretamente no modelo Ticket
- Metricas agregadas disponiveis via endpoints autenticados

## Avaliacao por Estrelas (Rating)

### Campos no Ticket

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `rating` | Int (1-5) | Nota em estrelas |
| `ratingComment` | String | Comentario opcional do cliente |
| `ratedAt` | DateTime | Quando o cliente avaliou |
| `ratingToken` | String (unique) | Token unico para o link de avaliacao |

### Fluxo

1. Ao resolver ou fechar um ticket, o sistema gera um `ratingToken` unico
2. Um link e enviado ao cliente (ex: `https://app.chatblue.com/rate/abc123token`)
3. O cliente acessa a pagina publica, ve informacoes do atendimento e escolhe de 1 a 5 estrelas
4. Opcionalmente, deixa um comentario
5. A avaliacao e registrada no ticket e nao pode ser alterada

### Endpoints Publicos de Avaliacao

#### `GET /api/public/rate/:token`

Retorna informacoes do ticket para exibir na pagina de avaliacao. Nao requer autenticacao.

**Resposta (200) - Ainda nao avaliado:**

```json
{
  "alreadyRated": false,
  "protocol": "#2024-001234",
  "companyName": "Empresa Exemplo",
  "companyLogo": "https://...",
  "contactName": "Joao Silva"
}
```

**Resposta (200) - Ja avaliado:**

```json
{
  "alreadyRated": true,
  "rating": 5,
  "protocol": "#2024-001234",
  "companyName": "Empresa Exemplo",
  "companyLogo": "https://...",
  "contactName": "Joao Silva"
}
```

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 404 | Token invalido ou nao encontrado |

#### `POST /api/public/rate/:token`

Registra a avaliacao do cliente. Nao requer autenticacao.

**Body:**

```json
{
  "rating": 5,
  "comment": "Excelente atendimento, muito rapido!"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `rating` | Number | Sim | Nota de 1 a 5 |
| `comment` | String | Nao | Comentario livre |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Avaliacao registrada com sucesso!",
  "protocol": "#2024-001234",
  "rating": 5
}
```

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 400 | Ticket ja foi avaliado |
| 404 | Token invalido |

## NPS - Net Promoter Score

### O que e NPS

O NPS mede a lealdade do cliente em uma escala de 0 a 10:

| Faixa | Classificacao | Descricao |
|-------|---------------|-----------|
| **9-10** | Promotores | Clientes leais que recomendam a empresa |
| **7-8** | Neutros (Passivos) | Satisfeitos mas nao entusiasmados |
| **0-6** | Detratores | Insatisfeitos que podem prejudicar a marca |

**Formula do NPS:**

```
NPS = % Promotores - % Detratores
```

O resultado varia de **-100** (todos detratores) a **+100** (todos promotores).

### Campos no Ticket

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `npsScore` | Int (0-10) | Nota NPS do cliente |
| `npsComment` | String | Comentario opcional |
| `npsRatedAt` | DateTime | Quando o cliente respondeu |
| `npsToken` | String (unique) | Token unico para o link da pesquisa |

### Fluxo

1. Ao resolver ou fechar um ticket, o sistema gera um `npsToken` unico
2. Um link e enviado ao cliente (ex: `https://app.chatblue.com/nps/abc123token`)
3. O cliente acessa a pagina publica e seleciona uma nota de 0 a 10
4. Opcionalmente, deixa um comentario
5. A resposta e registrada no ticket e nao pode ser alterada

### Endpoints Publicos de NPS

#### `GET /api/public/nps/:token`

Retorna informacoes e status da pesquisa NPS. Nao requer autenticacao. A logica e delegada ao `NPSService`.

**Resposta (200):**

```json
{
  "valid": true,
  "alreadyRated": false,
  "protocol": "#2024-001234",
  "companyName": "Empresa Exemplo",
  "contactName": "Joao Silva"
}
```

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 404 | Token invalido (`valid: false`) |

#### `POST /api/public/nps/:token`

Registra a resposta NPS do cliente. Nao requer autenticacao. A logica e delegada ao `NPSService`.

**Body:**

```json
{
  "score": 9,
  "comment": "Otimo atendimento, resolveram rapido!"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `score` | Number | Sim | Nota de 0 a 10 |
| `comment` | String | Nao | Comentario livre |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Resposta NPS registrada com sucesso!"
}
```

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 400 | Pesquisa ja respondida ou erro de validacao |
| 404 | Token invalido |

## Paginas Frontend

O frontend possui duas paginas publicas dedicadas para coleta de feedback:

| Pagina | Rota | Descricao |
|--------|------|-----------|
| Avaliacao | `/rate/[token]` | Pagina de avaliacao por estrelas (1-5) |
| NPS | `/nps/[token]` | Pagina de pesquisa NPS (0-10) |

Ambas as paginas:

- Exibem o logo e nome da empresa
- Mostram o protocolo do ticket e nome do contato
- Permitem resposta unica (exibem mensagem de agradecimento se ja respondido)
- Sao acessiveis sem login

## Metricas NPS Agregadas

### `GET /api/metrics/nps`

Retorna metricas NPS agregadas da empresa. Requer autenticacao.

**Query Parameters:**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `period` | Number | 30 | Numero de dias para considerar |

**Resposta (200):**

```json
{
  "summary": {
    "nps": 45,
    "promoters": 120,
    "passives": 50,
    "detractors": 30,
    "total": 200
  },
  "byDepartment": [
    {
      "id": "dept1",
      "name": "Comercial",
      "color": "#3B82F6",
      "nps": 60,
      "promoters": 40,
      "passives": 15,
      "detractors": 5,
      "total": 60
    }
  ],
  "trend": [
    {
      "date": "2024-01-15",
      "nps": 42,
      "responses": 8
    }
  ],
  "recentComments": [
    {
      "score": 3,
      "comment": "Demorou muito para resolver",
      "date": "2024-01-20T14:30:00Z",
      "category": "detractor"
    },
    {
      "score": 10,
      "comment": "Excelente!",
      "date": "2024-01-19T10:00:00Z",
      "category": "promoter"
    }
  ]
}
```

### Detalhes da Resposta

| Campo | Descricao |
|-------|-----------|
| `summary` | NPS geral com contagem de promotores, neutros e detratores |
| `byDepartment` | NPS segmentado por departamento |
| `trend` | Tendencia diaria do NPS no periodo |
| `recentComments` | Ultimos 10 comentarios, priorizando detratores |

Os comentarios recentes sao ordenados do menor score para o maior, garantindo que feedback negativo receba atencao prioritaria.

## Calculo do NPS

O calculo utilizado internamente:

```
1. Filtrar tickets com npsScore nao nulo no periodo
2. Classificar:
   - Promotores: score >= 9
   - Neutros: score >= 7 e score <= 8
   - Detratores: score <= 6
3. NPS = arredondar(((promotores - detratores) / total) * 100)
```

### Exemplos de Interpretacao

| NPS | Interpretacao |
|-----|---------------|
| 75 a 100 | Excelente - zona de excelencia |
| 50 a 74 | Muito bom - qualidade alta |
| 0 a 49 | Razoavel - ha espaco para melhorar |
| -100 a -1 | Critico - requer acao imediata |

## Apos o envio da pesquisa (janela sem reabertura automatica)

Depois que o **NPS** e enviado ao cliente (mensagem com link), o sistema regista `surveySentAt` no ticket. Durante **12 horas** (configuravel pela variavel de ambiente `POST_SURVEY_QUIET_HOURS` na API):

- Mensagens simples do cliente (ex.: "obrigado") **nao** reabrem o ticket automaticamente para `PENDING`; a mensagem fica registada no mesmo protocolo **RESOLVED** ou **CLOSED**.
- Apos esse periodo, o comportamento volta a ser o de reabertura automatica habitual.

### Encerramento pelo atendente

Enquanto o ticket estiver **RESOLVED** ou **CLOSED** e dentro da janela, o painel de chat pode mostrar a acao **Ignorar respostas e encerrar**, que chama `POST /api/tickets/:id/dismiss-post-survey` e passa o ticket a **CLOSED** com registo de atividade (ciclo pos-pesquisa fechado de forma explicita).

### Notas

- O envio do NPS tem de **concluir com sucesso** para `surveySentAt` ser preenchido (falha no envio pela API do WhatsApp nao inicia a janela).
- No frontend, a duracao exibida pode alinhar-se com `NEXT_PUBLIC_POST_SURVEY_QUIET_HOURS` (opcional; padrao 12 horas).

## Integracao com Outras Funcionalidades

### Tickets

- Os tokens sao gerados automaticamente ao resolver ou fechar um ticket
- Os campos de avaliacao e NPS ficam no modelo Ticket
- O endpoint `POST /tickets/:id/resolve` e `POST /tickets/:id/close` disparam o envio dos links

### Metricas e Dashboard

- `GET /api/metrics/dashboard` inclui media de avaliacao
- `GET /api/metrics/agents` mostra avaliacao media por atendente
- `GET /api/metrics/comparison` compara NPS entre meses
- `GET /api/metrics/executive` inclui NPS no resumo executivo

### Performance de Atendentes

- `GET /api/metrics/users/ranking` inclui `avgRating`, `totalRatings` e `ratingDistribution` por atendente
- `GET /api/metrics/users/:userId` mostra avaliacoes recentes com comentarios

## Boas Praticas

1. **Acompanhe detratores** - Comentarios de clientes com score 0-6 devem receber atencao imediata
2. **Segmente por departamento** - Compare NPS entre departamentos para identificar pontos de melhoria
3. **Monitore tendencias** - Quedas no NPS ao longo do tempo indicam problemas sistematicos
4. **Responda feedback** - Use os comentarios para treinar a equipe
5. **Compare IA vs Humano** - O endpoint `/api/metrics/ai` compara NPS entre atendimentos de IA e humanos

## Proximos Passos

- [Metas e Alertas](/funcionalidades/metas-alertas) - Definir metas de NPS e receber alertas
- [SLA e Metricas](/funcionalidades/sla-metricas) - Metricas gerais de atendimento
- [Tickets](/funcionalidades/tickets) - Ciclo de vida do ticket e avaliacao
