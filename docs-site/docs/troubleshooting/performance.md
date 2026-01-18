---
sidebar_position: 5
title: Performance e Otimizacao
description: Guia de otimizacao de performance do ChatBlue
---

# Performance e Otimizacao

Este guia apresenta tecnicas e estrategias para otimizar a performance do ChatBlue em producao.

## Diagnostico de Performance

### Identificar Gargalos

```bash
# Uso de CPU e memoria em tempo real
htop

# Processos Node.js
ps aux | grep node

# I/O de disco
iotop

# Rede
nethogs

# Resumo geral
vmstat 1 5
```

### Benchmark da API

```bash
# Instalar hey (ferramenta de benchmark HTTP)
wget https://hey-release.s3.us-east-2.amazonaws.com/hey_linux_amd64
chmod +x hey_linux_amd64
sudo mv hey_linux_amd64 /usr/local/bin/hey

# Benchmark simples
hey -n 1000 -c 50 https://api.seu-dominio.com.br/health

# Benchmark com autenticacao
hey -n 1000 -c 50 -H "Authorization: Bearer TOKEN" \
    https://api.seu-dominio.com.br/api/tickets

# Benchmark POST
hey -n 500 -c 25 -m POST \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}' \
    https://api.seu-dominio.com.br/api/messages
```

### Profiling do Node.js

```bash
# Iniciar com profiler
node --prof apps/api/dist/index.js

# Processar arquivo de log
node --prof-process isolate-*.log > profile.txt

# Usar Chrome DevTools
node --inspect apps/api/dist/index.js
# Abrir chrome://inspect no Chrome
```

## Otimizacao do Backend

### Cache com Redis

```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Cache generico
export async function cache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Tentar buscar do cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Buscar dados frescos
  const data = await fetcher();

  // Salvar no cache
  await redis.setex(key, ttlSeconds, JSON.stringify(data));

  return data;
}

// Invalidar cache
export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Exemplo de uso
export async function getCompanySettings(companyId: string) {
  return cache(
    `company:${companyId}:settings`,
    async () => {
      return await prisma.companySettings.findUnique({
        where: { companyId },
      });
    },
    600 // 10 minutos
  );
}
```

### Rate Limiting

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Rate limiter geral
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisicoes por minuto
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para autenticacao
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas
  message: { error: 'Too many login attempts' },
  skipSuccessfulRequests: true,
});

// Rate limiter para API de mensagens
export const messageLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Aplicar middleware
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/messages', messageLimiter);
```

### Compressao de Resposta

```typescript
// middleware/compression.ts
import compression from 'compression';

// Compressao com filtro
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Nivel de compressao (1-9)
  threshold: 1024, // Minimo de 1KB para comprimir
}));
```

### Connection Pool do Prisma

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Middleware para logging de queries lentas
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (duration > 100) {
    console.warn(`Query lenta (${duration}ms): ${params.model}.${params.action}`);
  }

  return result;
});
```

### Otimizar Queries

```typescript
// Ruim: Busca todos os campos
const tickets = await prisma.ticket.findMany({
  where: { companyId },
});

// Bom: Seleciona apenas necessarios
const tickets = await prisma.ticket.findMany({
  select: {
    id: true,
    status: true,
    createdAt: true,
    contact: {
      select: { name: true, number: true },
    },
  },
  where: { companyId },
});

// Ruim: N+1 queries
for (const ticket of tickets) {
  ticket.messages = await prisma.message.findMany({
    where: { ticketId: ticket.id },
  });
}

// Bom: Uma unica query
const tickets = await prisma.ticket.findMany({
  include: {
    messages: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
  where: { companyId },
});

// Excelente: Usar raw query para casos complexos
const stats = await prisma.$queryRaw`
  SELECT
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
  FROM tickets
  WHERE company_id = ${companyId}
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC
`;
```

## Otimizacao do Frontend

### Bundle Size

```bash
# Analisar bundle
cd /var/www/chatblue/apps/web
pnpm add -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... config
});

# Executar analise
ANALYZE=true pnpm build
```

### Code Splitting

```typescript
// Lazy loading de componentes pesados
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <Skeleton height={200} />,
});
```

### Otimizar Imagens

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['api.seu-dominio.com.br'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/avif', 'image/webp'],
  },
};

// Componente de imagem otimizada
import Image from 'next/image';

function Avatar({ src, name }) {
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      placeholder="blur"
      blurDataURL="/placeholder.png"
      loading="lazy"
    />
  );
}
```

### Cache de Dados com React Query

```typescript
// hooks/useTickets.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useTickets(companyId: string) {
  return useQuery({
    queryKey: ['tickets', companyId],
    queryFn: () => fetchTickets(companyId),
    staleTime: 30 * 1000, // 30 segundos
    cacheTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch a cada minuto
  });
}

// Prefetch para navegacao antecipada
export function usePrefetchTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['ticket', ticketId],
      queryFn: () => fetchTicket(ticketId),
      staleTime: 60 * 1000,
    });
  };
}

// Invalidar cache apos mutacao
export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.setQueryData(['ticket', data.id], data);
    },
  });
}
```

### Virtualizacao de Listas

```typescript
// Para listas longas de mensagens
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada de cada mensagem
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MessageItem message={messages[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Otimizacao do Nginx

### Configuracoes de Performance

```nginx
# /etc/nginx/nginx.conf

# Worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Buffers
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 50M;
    large_client_header_buffers 4 32k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 65;
    send_timeout 10;

    # File cache
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        application/javascript
        application/json
        application/xml
        application/rss+xml
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Proxy buffers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    proxy_temp_file_write_size 256k;
}
```

### Cache de Estaticos

```nginx
# Cache de arquivos estaticos
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    access_log off;
}

# Cache do Next.js
location /_next/static {
    alias /var/www/chatblue/apps/web/.next/static;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

## Otimizacao do PostgreSQL

### Configuracoes de Performance

```bash
# /etc/postgresql/16/main/postgresql.conf

# Memoria
shared_buffers = 2GB                 # 25% da RAM
effective_cache_size = 6GB           # 75% da RAM
maintenance_work_mem = 512MB
work_mem = 64MB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 64MB
max_wal_size = 2GB
min_wal_size = 1GB

# Planner
random_page_cost = 1.1               # Para SSD
effective_io_concurrency = 200       # Para SSD
default_statistics_target = 100

# Conexoes
max_connections = 200
```

### Indices Essenciais

```sql
-- Indices para consultas frequentes
CREATE INDEX CONCURRENTLY idx_tickets_company_status
ON tickets(company_id, status);

CREATE INDEX CONCURRENTLY idx_tickets_updated_at
ON tickets(updated_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_ticket_created
ON messages(ticket_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_contacts_company_number
ON contacts(company_id, number);

-- Indice parcial para tickets abertos
CREATE INDEX CONCURRENTLY idx_tickets_open
ON tickets(company_id, created_at DESC)
WHERE status IN ('open', 'pending');

-- Indice de texto para busca
CREATE INDEX CONCURRENTLY idx_messages_body_search
ON messages USING gin(to_tsvector('portuguese', body));
```

## Otimizacao do Redis

### Configuracoes

```bash
# /etc/redis/redis.conf

# Memoria
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistencia
save 900 1
save 300 10
save 60 10000

# Performance
tcp-keepalive 300
tcp-backlog 511
```

### Usar Redis para Filas

```typescript
// jobs/queue.ts
import Bull from 'bull';

const messageQueue = new Bull('messages', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Processar mensagens em background
messageQueue.process(10, async (job) => {
  const { ticketId, message } = job.data;
  await sendWhatsAppMessage(ticketId, message);
});

// Adicionar job
export async function queueMessage(ticketId: string, message: string) {
  await messageQueue.add({ ticketId, message }, {
    priority: 1,
    delay: 0,
  });
}
```

## Monitoramento de Performance

### Metricas Essenciais

```typescript
// middleware/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode,
      },
      duration
    );
    activeConnections.dec();
  });

  next();
});
```

### Dashboard de Performance

Crie dashboard no Grafana com:

1. **Latencia P95/P99**
2. **Throughput (req/s)**
3. **Taxa de Erro**
4. **Uso de CPU/Memoria**
5. **Conexoes de Banco**
6. **Cache Hit Rate**
7. **Queue Size**

## Checklist de Performance

- [ ] Cache configurado para queries frequentes
- [ ] Rate limiting implementado
- [ ] Indices de banco otimizados
- [ ] Bundle do frontend otimizado
- [ ] Compressao habilitada
- [ ] CDN configurado para estaticos
- [ ] Conexoes de banco com pool
- [ ] Filas para jobs pesados
- [ ] Monitoramento ativo
- [ ] Alertas configurados

## Boas Praticas

:::tip Recomendacoes
1. **Meca antes de otimizar**: Use profiling para identificar gargalos reais
2. **Cache estrategico**: Cache dados lidos frequentemente que mudam pouco
3. **Queries eficientes**: Use EXPLAIN ANALYZE para queries lentas
4. **Assincrono quando possivel**: Use filas para tarefas pesadas
5. **Monitore constantemente**: Configure alertas para degradacao
6. **Escale horizontalmente**: Adicione mais instancias quando necessario
:::

## Proximos Passos

- [Monitoramento](/deploy/monitoramento)
- [Problemas de Banco de Dados](/troubleshooting/banco-dados)
