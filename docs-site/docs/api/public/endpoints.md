---
sidebar_position: 1
title: API Publica
description: Endpoints publicos para avaliacao de atendimento e pesquisa NPS no ChatBlue
---

# API Publica

Endpoints publicos que nao exigem autenticacao. Utilizados em paginas externas de avaliacao e pesquisa NPS enviadas ao cliente final.

## Avaliacao de Atendimento

### Consultar status da avaliacao

```
GET /api/public/rate/:token
```

Retorna informacoes do ticket para exibicao na pagina de avaliacao. Se o ticket ja foi avaliado, retorna a nota existente.

#### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `token` | string | Token unico de avaliacao do ticket (`ratingToken`) |

#### Autenticacao

Nenhuma. Este endpoint e publico.

#### Response - Ainda nao avaliado (200 OK)

```json
{
  "alreadyRated": false,
  "protocol": "ATD-20240115-0042",
  "companyName": "Minha Empresa",
  "companyLogo": "https://storage.example.com/logo.png",
  "contactName": "Joao Silva"
}
```

#### Response - Ja avaliado (200 OK)

```json
{
  "alreadyRated": true,
  "rating": 5,
  "protocol": "ATD-20240115-0042",
  "companyName": "Minha Empresa",
  "companyLogo": "https://storage.example.com/logo.png",
  "contactName": "Joao Silva"
}
```

#### Erros

| Status | Descricao |
|--------|-----------|
| 404 | Token nao encontrado |

---

### Enviar avaliacao

```
POST /api/public/rate/:token
```

Registra a avaliacao do cliente para o atendimento. Aceita nota de 1 a 5 e comentario opcional.

#### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `token` | string | Token unico de avaliacao do ticket |

#### Autenticacao

Nenhuma. Este endpoint e publico.

#### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `rating` | number | Sim | Nota de 1 a 5 |
| `comment` | string | Nao | Comentario do cliente |

```json
{
  "rating": 5,
  "comment": "Otimo atendimento, muito rapido!"
}
```

#### Response - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Avaliacao registrada com sucesso!",
  "protocol": "ATD-20240115-0042",
  "rating": 5
}
```

#### Erros

| Status | Descricao |
|--------|-----------|
| 400 | Dados invalidos (nota fora do intervalo 1-5) |
| 400 | Atendimento ja foi avaliado |
| 404 | Token nao encontrado |

---

## Pesquisa NPS

### Consultar status da pesquisa NPS

```
GET /api/public/nps/:token
```

Retorna o status da pesquisa NPS vinculada ao token. Indica se a pesquisa e valida e se ja foi respondida.

#### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `token` | string | Token unico da pesquisa NPS |

#### Autenticacao

Nenhuma. Este endpoint e publico.

#### Response - Sucesso (200 OK)

```json
{
  "valid": true,
  "alreadyAnswered": false,
  "companyName": "Minha Empresa",
  "companyLogo": "https://storage.example.com/logo.png",
  "contactName": "Joao Silva"
}
```

#### Erros

| Status | Descricao |
|--------|-----------|
| 404 | Pesquisa nao encontrada ou token invalido |

---

### Enviar resposta NPS

```
POST /api/public/nps/:token
```

Registra a resposta do cliente na pesquisa NPS. Aceita score de 0 a 10.

#### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `token` | string | Token unico da pesquisa NPS |

#### Autenticacao

Nenhuma. Este endpoint e publico.

#### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `score` | number | Sim | Nota de 0 a 10 |
| `comment` | string | Nao | Comentario do cliente |

```json
{
  "score": 9,
  "comment": "Excelente servico, recomendo!"
}
```

#### Response - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Resposta NPS registrada com sucesso!"
}
```

#### Erros

| Status | Descricao |
|--------|-----------|
| 400 | Dados invalidos (score fora do intervalo 0-10) |
| 400 | Pesquisa ja foi respondida |
| 404 | Token nao encontrado |

---

## Classificacao NPS

| Score | Categoria |
|-------|-----------|
| 9-10 | Promotor |
| 7-8 | Neutro |
| 0-6 | Detrator |

O NPS e calculado como: `% Promotores - % Detratores`, resultando em um valor entre -100 e 100.

## Exemplos de Codigo

### cURL

```bash
# Consultar avaliacao
curl -X GET "https://api.chatblue.io/api/public/rate/abc123-token-unico"

# Enviar avaliacao
curl -X POST "https://api.chatblue.io/api/public/rate/abc123-token-unico" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Otimo atendimento!"}'

# Consultar NPS
curl -X GET "https://api.chatblue.io/api/public/nps/nps-token-unico"

# Enviar resposta NPS
curl -X POST "https://api.chatblue.io/api/public/nps/nps-token-unico" \
  -H "Content-Type: application/json" \
  -d '{"score": 9, "comment": "Excelente!"}'
```

### JavaScript (Fetch)

```javascript
async function submitRating(token, rating, comment) {
  const response = await fetch(`https://api.chatblue.io/api/public/rate/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

async function submitNPS(token, score, comment) {
  const response = await fetch(`https://api.chatblue.io/api/public/nps/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}
```

## Notas Importantes

1. **Sem autenticacao**: Estes endpoints sao totalmente publicos. O token na URL e o unico mecanismo de seguranca.

2. **Uso unico**: Cada token so pode ser utilizado para uma avaliacao/resposta. Tentativas subsequentes retornam erro.

3. **Tokens unicos**: Cada ticket recebe um `ratingToken` unico gerado automaticamente na criacao.

## Endpoints Relacionados

- [Metricas NPS](/docs/api/metricas/dashboard) - Metricas consolidadas de NPS
- [Tickets](/docs/api/tickets/detalhes) - Detalhes do ticket com dados de avaliacao
