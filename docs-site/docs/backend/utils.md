---
sidebar_position: 7
title: Utilitarios
description: Funcoes utilitarias do backend
---

# Utilitarios

Funcoes auxiliares usadas em todo o backend.

## Protocol Generator

Gera numeros de protocolo unicos para tickets:

```typescript
// utils/protocol.ts
import { customAlphabet } from 'nanoid';

// Alfabeto para protocolo (sem caracteres ambiguos)
const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8);

export const generateProtocol = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = nanoid();

  return `${year}${month}-${random}`;
};

// Exemplo de saida: "2401-ABCD1234"
```

## Media URL Normalizer

Normaliza e valida URLs de midia:

```typescript
// utils/media-url.util.ts

export const normalizeMediaUrl = (url: string): string => {
  if (!url) return url;

  // Se ja e URL absoluta, retornar
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Se e path relativo, adicionar base URL
  if (url.startsWith('/')) {
    return `${process.env.API_URL}${url}`;
  }

  // Assumir path de uploads
  return `${process.env.API_URL}/uploads/${url}`;
};

export const getMediaType = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase();

  const types: Record<string, string> = {
    // Imagens
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',

    // Videos
    mp4: 'video',
    mov: 'video',
    avi: 'video',

    // Audio
    mp3: 'audio',
    ogg: 'audio',
    wav: 'audio',
    m4a: 'audio',

    // Documentos
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    xls: 'document',
    xlsx: 'document',
  };

  return types[ext || ''] || 'document';
};

export const isValidMediaUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
```

## Phone Normalizer

Normaliza numeros de telefone:

```typescript
// utils/phone.util.ts

export const normalizePhone = (phone: string): string => {
  // Remover tudo exceto numeros
  let cleaned = phone.replace(/\D/g, '');

  // Remover prefixo de WhatsApp (55 para Brasil)
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    // Manter o 55
  } else if (cleaned.length === 11 || cleaned.length === 10) {
    // Adicionar codigo do pais
    cleaned = `55${cleaned}`;
  }

  return cleaned;
};

export const formatPhone = (phone: string): string => {
  const cleaned = normalizePhone(phone);

  if (cleaned.length === 13) {
    // +55 (11) 99999-9999
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }

  if (cleaned.length === 12) {
    // +55 (11) 9999-9999
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  return phone;
};

export const isValidPhone = (phone: string): boolean => {
  const cleaned = normalizePhone(phone);
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Detectar se e LID (Linked ID) do WhatsApp
export const isLID = (id: string): boolean => {
  return id.includes(':') && id.includes('@lid');
};
```

## Date Helpers

Funcoes auxiliares para datas:

```typescript
// utils/date.util.ts
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
  addMinutes,
  differenceInMinutes,
  isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: ptBR });
};

export const formatRelative = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) {
    return formatTime(d);
  }

  if (isYesterday(d)) {
    return `Ontem ${formatTime(d)}`;
  }

  return formatDateTime(d);
};

export const formatTimeAgo = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

export const isBusinessHour = (
  date: Date,
  businessHours: { start: string; end: string; days: number[] }
): boolean => {
  const dayOfWeek = date.getDay();
  const timeString = format(date, 'HH:mm');

  return (
    businessHours.days.includes(dayOfWeek) &&
    timeString >= businessHours.start &&
    timeString <= businessHours.end
  );
};

export const addBusinessMinutes = (
  date: Date,
  minutes: number,
  businessHours: { start: string; end: string; days: number[] }
): Date => {
  let result = new Date(date);
  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    result = addMinutes(result, 1);

    if (isBusinessHour(result, businessHours)) {
      remainingMinutes--;
    }
  }

  return result;
};
```

## Encryption

Criptografia de dados sensiveis:

```typescript
// utils/encryption.util.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY deve ter 32 caracteres');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY deve ter 32 caracteres');
  }

  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
};
```

## Response Helpers

Padronizacao de respostas:

```typescript
// utils/response.util.ts
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(code && { code }),
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response => {
  return res.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
```

## Validation Helpers

Validacoes comuns:

```typescript
// utils/validation.util.ts

export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

export const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};
```

## Retry Helper

Funcao de retry com backoff:

```typescript
// utils/retry.util.ts

interface RetryOptions {
  attempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (error: Error, attempt: number) => void;
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < attempts) {
        if (onRetry) {
          onRetry(lastError, attempt);
        }

        const waitTime =
          backoff === 'exponential'
            ? delay * Math.pow(2, attempt - 1)
            : delay * attempt;

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
};

// Uso
const result = await retry(
  () => fetch('https://api.example.com/data'),
  {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential',
    onRetry: (error, attempt) => {
      console.log(`Tentativa ${attempt} falhou:`, error.message);
    },
  }
);
```

## Proximos Passos

- [Frontend](/frontend/visao-geral)
- [API Reference](/api/introducao)
- [Guias](/guias/introducao)
