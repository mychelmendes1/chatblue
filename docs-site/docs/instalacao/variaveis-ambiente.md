---
sidebar_position: 4
title: Variaveis de Ambiente
description: Configuracao completa das variaveis de ambiente do ChatBlue
---

# Variaveis de Ambiente

Esta pagina documenta todas as variaveis de ambiente utilizadas pelo ChatBlue.

## Arquivo .env.example

```env
# ============================================
# BANCO DE DADOS
# ============================================
DATABASE_URL="postgresql://chatblue:chatblue123@localhost:5432/chatblue"

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# ============================================
# AUTENTICACAO JWT
# ============================================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ============================================
# SERVIDOR
# ============================================
NODE_ENV="development"
API_PORT=3001
API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# ============================================
# EMAIL (SMTP)
# ============================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="ChatBlue <noreply@chatblue.com>"

# ============================================
# PUSH NOTIFICATIONS (VAPID)
# ============================================
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@chatblue.com"

# ============================================
# NOTION
# ============================================
NOTION_API_KEY=""
NOTION_DATABASE_ID=""

# ============================================
# INTELIGENCIA ARTIFICIAL
# ============================================
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
AI_DEFAULT_MODEL="gpt-4-turbo-preview"
WHISPER_API_KEY=""

# ============================================
# WHATSAPP META CLOUD API
# ============================================
META_APP_ID=""
META_APP_SECRET=""
META_ACCESS_TOKEN=""
META_PHONE_NUMBER_ID=""
META_WEBHOOK_VERIFY_TOKEN=""

# ============================================
# UPLOAD DE ARQUIVOS
# ============================================
MAX_FILE_SIZE=10485760
UPLOADS_DIR="./uploads"

# ============================================
# CRIPTOGRAFIA
# ============================================
ENCRYPTION_KEY="your-32-character-encryption-key"

# ============================================
# DOCKER (PRODUCAO)
# ============================================
DB_USER="chatblue"
DB_PASSWORD="your-secure-db-password"
DB_NAME="chatblue"
```

## Descricao Detalhada

### Banco de Dados

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `DATABASE_URL` | string | - | URL de conexao PostgreSQL (Prisma) |

**Formato da URL:**
```
postgresql://USUARIO:SENHA@HOST:PORTA/DATABASE
```

**Exemplo com SSL:**
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Redis

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `REDIS_URL` | string | - | URL de conexao Redis |
| `REDIS_PASSWORD` | string | "" | Senha do Redis (opcional) |

**Formato da URL:**
```
redis://HOST:PORTA
redis://:SENHA@HOST:PORTA
```

### Autenticacao JWT

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `JWT_SECRET` | string | - | Chave secreta para access tokens |
| `JWT_REFRESH_SECRET` | string | - | Chave secreta para refresh tokens |
| `JWT_EXPIRES_IN` | string | "15m" | Tempo de expiracao do access token |
| `JWT_REFRESH_EXPIRES_IN` | string | "7d" | Tempo de expiracao do refresh token |

**Formatos de tempo:**
- `15m` = 15 minutos
- `1h` = 1 hora
- `7d` = 7 dias
- `30d` = 30 dias

:::warning Seguranca
Use chaves aleatorias de pelo menos 32 caracteres em producao!

```bash
# Gerar chave aleatoria
openssl rand -base64 32
```
:::

### Servidor

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `NODE_ENV` | string | "development" | Ambiente (development, production, test) |
| `API_PORT` | number | 3001 | Porta do servidor Express |
| `API_URL` | string | - | URL publica da API |
| `FRONTEND_URL` | string | - | URL do frontend (CORS) |

### Email (SMTP)

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `SMTP_HOST` | string | "smtp.gmail.com" | Servidor SMTP |
| `SMTP_PORT` | number | 587 | Porta SMTP |
| `SMTP_SECURE` | boolean | false | Usar SSL/TLS |
| `SMTP_USER` | string | - | Usuario SMTP |
| `SMTP_PASS` | string | - | Senha SMTP |
| `EMAIL_FROM` | string | - | Endereco remetente |

**Configuracao Gmail:**
1. Ative "Acesso a apps menos seguros" ou
2. Use uma "Senha de app" (recomendado)

### Push Notifications (VAPID)

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `VAPID_PUBLIC_KEY` | string | - | Chave publica VAPID |
| `VAPID_PRIVATE_KEY` | string | - | Chave privada VAPID |
| `VAPID_SUBJECT` | string | - | Email de contato (mailto:) |

**Gerar chaves VAPID:**
```bash
npx web-push generate-vapid-keys
```

### Notion

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `NOTION_API_KEY` | string | - | Token de integracao Notion |
| `NOTION_DATABASE_ID` | string | - | ID do banco de dados Notion |

**Como obter:**
1. Crie uma integracao em https://www.notion.so/my-integrations
2. Compartilhe o banco de dados com a integracao
3. Copie o ID do banco da URL

### Inteligencia Artificial

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `OPENAI_API_KEY` | string | - | API Key da OpenAI |
| `ANTHROPIC_API_KEY` | string | - | API Key da Anthropic |
| `AI_DEFAULT_MODEL` | string | "gpt-4-turbo-preview" | Modelo padrao |
| `WHISPER_API_KEY` | string | - | API Key para transcricao (geralmente OpenAI) |

**Modelos disponiveis:**
- OpenAI: `gpt-4-turbo-preview`, `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`
- Anthropic: `claude-opus-4`, `claude-sonnet-4`, `claude-3-5-sonnet`, `claude-3-haiku`

### WhatsApp Meta Cloud API

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `META_APP_ID` | string | - | ID do App Meta |
| `META_APP_SECRET` | string | - | Secret do App Meta |
| `META_ACCESS_TOKEN` | string | - | Token de acesso permanente |
| `META_PHONE_NUMBER_ID` | string | - | ID do numero de telefone |
| `META_WEBHOOK_VERIFY_TOKEN` | string | - | Token de verificacao webhook |

**Como obter:**
1. Acesse https://developers.facebook.com
2. Crie um app do tipo Business
3. Configure o WhatsApp Business API
4. Gere um token de acesso permanente

### Upload de Arquivos

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `MAX_FILE_SIZE` | number | 10485760 | Tamanho maximo em bytes (10MB) |
| `UPLOADS_DIR` | string | "./uploads" | Diretorio de uploads |

### Criptografia

| Variavel | Tipo | Padrao | Descricao |
|----------|------|--------|-----------|
| `ENCRYPTION_KEY` | string | - | Chave de 32 caracteres para criptografia |

**Gerar chave:**
```bash
openssl rand -hex 16
```

## Variaveis do Frontend

Arquivo: `apps/web/.env.local`

| Variavel | Tipo | Descricao |
|----------|------|-----------|
| `NEXT_PUBLIC_API_URL` | string | URL da API backend |

:::info Prefixo NEXT_PUBLIC_
Variaveis que precisam estar disponiveis no cliente devem comecar com `NEXT_PUBLIC_`.
:::

## Configuracao por Ambiente

### Desenvolvimento

```env
NODE_ENV=development
DATABASE_URL=postgresql://chatblue:chatblue123@localhost:5432/chatblue
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### Staging

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@staging-db:5432/chatblue
REDIS_URL=redis://staging-redis:6379
API_URL=https://api.staging.chatblue.com
FRONTEND_URL=https://staging.chatblue.com
```

### Producao

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/chatblue?sslmode=require
REDIS_URL=redis://:password@prod-redis:6379
API_URL=https://api.chatblue.com
FRONTEND_URL=https://chatblue.com
```

## Boas Praticas

### Seguranca

1. **Nunca commite arquivos .env**
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use chaves fortes**
   ```bash
   # Gerar chave JWT
   openssl rand -base64 32

   # Gerar chave de criptografia
   openssl rand -hex 16
   ```

3. **Rotacione chaves periodicamente**

4. **Use diferentes chaves por ambiente**

### Organizacao

1. **Agrupe variaveis relacionadas**
2. **Documente cada variavel**
3. **Mantenha .env.example atualizado**
4. **Valide variaveis na inicializacao**

### Validacao

O ChatBlue valida variaveis obrigatorias na inicializacao:

```typescript
// Variaveis obrigatorias
const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Variavel de ambiente ${key} e obrigatoria`);
  }
});
```

## Proximos Passos

- [Arquitetura do Sistema](/arquitetura/visao-geral)
- [Configuracao de Integracoes](/guias/introducao)
- [Deploy em Producao](/deploy/producao)
