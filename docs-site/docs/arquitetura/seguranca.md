---
sidebar_position: 5
title: Seguranca
description: Mecanismos de seguranca implementados no ChatBlue
---

# Seguranca

O ChatBlue implementa multiplas camadas de seguranca para proteger os dados dos usuarios e empresas.

## Autenticacao

### JWT (JSON Web Tokens)

O sistema usa JWT para autenticacao stateless:

```typescript
// Estrutura do Access Token
{
  "userId": "uuid",
  "companyId": "uuid",
  "role": "ADMIN",
  "iat": 1234567890,
  "exp": 1234568790  // 15 minutos
}

// Estrutura do Refresh Token
{
  "userId": "uuid",
  "iat": 1234567890,
  "exp": 1235172690  // 7 dias
}
```

### Fluxo de Tokens

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE TOKENS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    LOGIN                  REQUISICOES                REFRESH
      │                         │                        │
      ▼                         ▼                        ▼
┌──────────┐             ┌──────────┐             ┌──────────┐
│  Email   │             │  Access  │             │ Refresh  │
│  Senha   │──────────►  │  Token   │──────────►  │  Token   │
└──────────┘             │ (15 min) │             │ (7 dias) │
                         └──────────┘             └──────────┘
                               │                        │
                               │ Expira                 │
                               │                        │
                               └───────────────────────►│
                                                        │
                                                        ▼
                                                  Novo Access
                                                     Token
```

### Configuracao JWT

```typescript
// Geracao de Access Token
const accessToken = jwt.sign(
  { userId, companyId, role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);

// Geracao de Refresh Token
const refreshToken = jwt.sign(
  { userId },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
);
```

## Hash de Senhas

### Bcrypt

Senhas sao hasheadas com bcrypt:

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Hash na criacao
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// Verificacao no login
const isValid = await bcrypt.compare(password, user.password);
```

### Requisitos de Senha

- Minimo 6 caracteres
- Recomendado: letras, numeros e simbolos

## Middlewares de Seguranca

### Auth Middleware

Valida o token JWT em rotas protegidas:

```typescript
export const authMiddleware = async (req, res, next) => {
  // Extrair token do header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuario existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario invalido' });
    }

    // Verificar acesso a empresa
    const access = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: decoded.userId,
          companyId: decoded.companyId,
        },
        status: 'APPROVED',
      },
    });

    if (!access) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido' });
  }
};
```

### Tenant Middleware

Garante isolamento multi-tenant:

```typescript
export const tenantMiddleware = (req, res, next) => {
  // companyId ja validado pelo auth middleware
  req.tenantId = req.user.companyId;
  next();
};
```

### CORS

Restricao de origens:

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Helmet

Headers de seguranca HTTP:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### Rate Limiting

Protecao contra abusos:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisicoes por janela
  message: 'Muitas requisicoes, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
```

## Controle de Acesso (RBAC)

### Roles

```typescript
enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Acesso total ao sistema
  ADMIN = 'ADMIN',              // Admin da empresa
  SUPERVISOR = 'SUPERVISOR',    // Supervisor de departamento
  AGENT = 'AGENT',              // Agente de atendimento
}
```

### Hierarquia de Permissoes

```
SUPER_ADMIN
    │
    ├── Gerenciar todas as empresas
    ├── Criar/editar empresas
    ├── Ver metricas globais
    │
    ▼
  ADMIN
    │
    ├── Gerenciar usuarios da empresa
    ├── Gerenciar departamentos
    ├── Configurar conexoes WhatsApp
    ├── Configurar IA
    ├── Ver todas as metricas
    │
    ▼
SUPERVISOR
    │
    ├── Gerenciar tickets do departamento
    ├── Transferir tickets
    ├── Ver metricas do departamento
    │
    ▼
  AGENT
    │
    ├── Atender tickets atribuidos
    ├── Transferir tickets (restrito)
    └── Ver proprias metricas
```

### Middlewares de Autorizacao

```typescript
// Verificar role minimo
export const requireRole = (...roles: Role[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissao insuficiente'
      });
    }
    next();
  };
};

// Uso nas rotas
router.post('/users',
  authMiddleware,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  createUser
);
```

## Validacao de Dados

### Zod

Validacao de entrada com schemas:

```typescript
import { z } from 'zod';

// Schema de validacao
const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']),
});

// Middleware de validacao
export const validate = (schema: z.ZodSchema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Dados invalidos',
        details: error.errors
      });
    }
  };
};
```

### Sanitizacao

```typescript
// Prevenir XSS
import xss from 'xss';

const sanitizedContent = xss(req.body.content);
```

## Criptografia

### Dados Sensiveis

Criptografia de dados sensiveis em repouso:

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

// Criptografar
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Descriptografar
function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### HTTPS

Em producao, todo trafego deve usar HTTPS:

```nginx
server {
    listen 80;
    server_name api.chatblue.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.chatblue.com;

    ssl_certificate /etc/letsencrypt/live/api.chatblue.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.chatblue.com/privkey.pem;

    # Configuracoes SSL seguras
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

## Protecao contra Ataques

### SQL Injection

Prisma ORM previne SQL injection por padrao:

```typescript
// Seguro - Prisma usa prepared statements
const user = await prisma.user.findFirst({
  where: { email: userInput },
});
```

### XSS

- Headers CSP via Helmet
- Sanitizacao de entrada
- React escapa por padrao

### CSRF

- Tokens JWT em headers (nao cookies)
- CORS configurado

### Brute Force

- Rate limiting
- Fail2Ban em producao

## Auditoria e Logs

### Logs de Seguranca

```typescript
// Log de tentativa de login
logger.info('Login attempt', {
  email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  success: true,
});

// Log de acesso negado
logger.warn('Access denied', {
  userId: req.user?.userId,
  resource: req.path,
  reason: 'Insufficient permissions',
});
```

### Activity Log

```prisma
model Activity {
  id        String   @id @default(uuid())
  companyId String
  userId    String?
  type      String   // LOGIN, LOGOUT, CREATE, UPDATE, DELETE
  resource  String   // USER, TICKET, MESSAGE
  resourceId String?
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

## Checklist de Seguranca

### Desenvolvimento

- [ ] Variaveis de ambiente nao commitadas
- [ ] Dependencias atualizadas
- [ ] Validacao de entrada em todas as rotas
- [ ] Logs sem dados sensiveis

### Producao

- [ ] HTTPS habilitado
- [ ] Headers de seguranca configurados
- [ ] Rate limiting ativo
- [ ] Firewall configurado
- [ ] Fail2Ban ativo
- [ ] Backup regular
- [ ] Monitoramento de seguranca

## Proximos Passos

- [Backend](/backend/visao-geral)
- [Deploy em Producao](/deploy/producao)
- [Monitoramento](/deploy/monitoramento)
