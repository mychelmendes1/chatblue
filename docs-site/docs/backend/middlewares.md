---
sidebar_position: 4
title: Middlewares
description: Middlewares do Express no ChatBlue
---

# Middlewares

Os middlewares interceptam requisicoes HTTP para executar logica comum como autenticacao, validacao e tratamento de erros.

## Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PIPELINE DE MIDDLEWARES                             │
└─────────────────────────────────────────────────────────────────────────────┘

    Request
       │
       ▼
┌──────────────┐
│    CORS      │  Controle de origem
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Helmet     │  Headers de seguranca
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Rate Limit   │  Protecao contra abuso
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  JSON Parse  │  Parse do body
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Auth      │  Autenticacao JWT
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Tenant     │  Isolamento multi-tenant
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Router     │  Roteamento
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Error      │  Tratamento de erros
└──────────────┘
       │
       ▼
    Response
```

## Auth Middleware

Valida tokens JWT e autentica usuarios:

```typescript
// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
  };
  tenantId?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extrair token do header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticacao nao fornecido',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar e decodificar token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        error: 'Token invalido',
      });
    }

    // 3. Verificar se usuario existe e esta ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        isActive: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Usuario nao encontrado',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Usuario desativado',
      });
    }

    // 4. Verificar acesso a empresa (se nao for super admin)
    if (user.role !== 'SUPER_ADMIN' && decoded.companyId) {
      const access = await prisma.userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: decoded.userId,
            companyId: decoded.companyId,
          },
        },
      });

      if (!access || access.status !== 'APPROVED') {
        return res.status(403).json({
          error: 'Acesso negado a esta empresa',
        });
      }
    }

    // 5. Anexar dados ao request
    req.user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Erro interno de autenticacao',
    });
  }
};
```

## Tenant Middleware

Garante isolamento multi-tenant:

```typescript
// middlewares/tenant.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Verificar se usuario esta autenticado
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuario nao autenticado',
    });
  }

  // Super admin pode acessar qualquer empresa
  if (req.user.role === 'SUPER_ADMIN') {
    // Usar companyId do query/params se fornecido
    req.tenantId = req.query.companyId as string ||
                   req.params.companyId ||
                   req.user.companyId;
  } else {
    // Usuarios normais usam companyId do token
    req.tenantId = req.user.companyId;
  }

  if (!req.tenantId) {
    return res.status(400).json({
      error: 'Empresa nao especificada',
    });
  }

  next();
};
```

## Error Middleware

Trata erros de forma centralizada:

```typescript
// middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Classes de erro customizadas
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso nao encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Nao autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflito de dados') {
    super(message, 409, 'CONFLICT');
  }
}

// Middleware de erro
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log do erro
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  // Erro customizado da aplicacao
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error instanceof ValidationError && { errors: error.errors }),
    });
  }

  // Erro do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Registro duplicado',
          code: 'DUPLICATE_ENTRY',
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Registro nao encontrado',
          code: 'NOT_FOUND',
        });
      default:
        return res.status(400).json({
          error: 'Erro de banco de dados',
          code: prismaError.code,
        });
    }
  }

  // Erro de validacao do Zod
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados invalidos',
      code: 'VALIDATION_ERROR',
      errors: (error as any).errors,
    });
  }

  // Erro generico
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : error.message,
    code: 'INTERNAL_ERROR',
  });
};
```

## Upload Middleware

Gerencia upload de arquivos:

```typescript
// middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';

// Configuracao de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADS_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    // Gerar nome unico
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

// Filtro de tipos de arquivo
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Tipos permitidos
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo nao permitido: ${file.mimetype}`));
  }
};

// Configuracao do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
});

// Middleware para upload unico
export const uploadSingle = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Middleware para multiplos uploads
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};
```

## Rate Limit Middleware

Protege contra abusos:

```typescript
// middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

// Rate limit global
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisicoes por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisicoes. Tente novamente em alguns minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
});

// Rate limit para login (mais restritivo)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'LOGIN_RATE_LIMIT',
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:login:',
  }),
});

// Rate limit para envio de mensagens
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 mensagens por minuto
  message: {
    error: 'Limite de mensagens atingido. Aguarde um momento.',
    code: 'MESSAGE_RATE_LIMIT',
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:message:',
  }),
});
```

## Validation Middleware

Valida entrada com Zod:

```typescript
// middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from './error.middleware';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Dados invalidos', error.errors);
      }
      throw error;
    }
  };
};

// Schemas comuns
export const schemas = {
  // Paginacao
  pagination: z.object({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
  }),

  // ID UUID
  uuidParam: z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  }),

  // Criar usuario
  createUser: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2).max(100),
      role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
    }),
  }),

  // Criar ticket
  createTicket: z.object({
    body: z.object({
      contactId: z.string().uuid(),
      departmentId: z.string().uuid().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    }),
  }),

  // Enviar mensagem
  sendMessage: z.object({
    params: z.object({
      ticketId: z.string().uuid(),
    }),
    body: z.object({
      content: z.string().min(1).max(4096),
      mediaUrl: z.string().url().optional(),
      mediaType: z.string().optional(),
    }),
  }),
};
```

## Logging Middleware

Registra requisicoes:

```typescript
// middlewares/logging.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Capturar resposta
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId,
      companyId: (req as any).user?.companyId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
};
```

## Role Middleware

Verifica permissoes por role:

```typescript
// middlewares/role.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { ForbiddenError } from './error.middleware';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'AGENT';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Usuario nao autenticado');
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new ForbiddenError('Permissao insuficiente');
    }

    next();
  };
};

// Shortcuts
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');
export const requireSupervisor = requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR');
export const requireSuperAdmin = requireRole('SUPER_ADMIN');
```

## Aplicando Middlewares

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './middlewares/rate-limit.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

// Middlewares globais (ordem importa!)
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(globalLimiter);
app.use(express.json());
app.use(loggingMiddleware);

// Rotas
app.use('/api', routes);

// Error handler (sempre por ultimo)
app.use(errorMiddleware);

export default app;
```

## Uso nas Rotas

```typescript
// routes/users.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validate, schemas } from '../middlewares/validation.middleware';

const router = Router();

// Aplicar auth e tenant em todas as rotas
router.use(authMiddleware);
router.use(tenantMiddleware);

// Listar usuarios (todos podem)
router.get('/', listUsers);

// Criar usuario (apenas admin)
router.post('/',
  requireAdmin,
  validate(schemas.createUser),
  createUser
);

// Atualizar usuario (apenas admin)
router.put('/:id',
  requireAdmin,
  validate(schemas.uuidParam),
  updateUser
);

export default router;
```

## Proximos Passos

- [WebSocket](/backend/websocket)
- [Jobs](/backend/jobs)
- [Utils](/backend/utils)
