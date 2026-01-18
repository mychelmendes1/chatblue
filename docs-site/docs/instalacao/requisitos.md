---
sidebar_position: 1
title: Requisitos do Sistema
description: Requisitos de hardware e software para executar o ChatBlue
---

# Requisitos do Sistema

Esta pagina descreve os requisitos minimos e recomendados para executar o ChatBlue.

## Requisitos de Software

### Obrigatorios

| Software | Versao Minima | Recomendado | Notas |
|----------|---------------|-------------|-------|
| Node.js | 18.0.0 | 20.x LTS | Runtime JavaScript |
| pnpm | 8.0.0 | 8.12+ | Gerenciador de pacotes |
| PostgreSQL | 12.0 | 16.x | Banco de dados principal |
| Redis | 6.0 | 7.x | Cache e filas |
| Docker | 20.10 | 24.x | Containerizacao (opcional) |
| Docker Compose | 2.0 | 2.20+ | Orquestracao (opcional) |

### Desenvolvimento

| Software | Versao | Proposito |
|----------|--------|-----------|
| Git | 2.30+ | Controle de versao |
| VS Code | Ultima | IDE recomendada |
| Prisma CLI | 5.x | Gerenciamento do banco |

## Requisitos de Hardware

### Desenvolvimento (Local)

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disco | 10 GB | 20+ GB SSD |
| Rede | Banda larga | Fibra optica |

### Producao (Servidor)

| Recurso | Pequeno | Medio | Grande |
|---------|---------|-------|--------|
| CPU | 2 vCPUs | 4 vCPUs | 8+ vCPUs |
| RAM | 4 GB | 8 GB | 16+ GB |
| Disco | 40 GB SSD | 100 GB SSD | 250+ GB SSD |
| Rede | 100 Mbps | 500 Mbps | 1+ Gbps |

### Estimativa de Carga

| Metrica | Pequeno | Medio | Grande |
|---------|---------|-------|--------|
| Empresas | 1-5 | 5-20 | 20+ |
| Usuarios | 1-20 | 20-100 | 100+ |
| Tickets/dia | 100 | 500 | 2000+ |
| Mensagens/dia | 1000 | 5000 | 20000+ |

## Portas Utilizadas

| Porta | Servico | Configuravel |
|-------|---------|--------------|
| 3000 | Frontend (Next.js) | Sim |
| 3001 | Backend (Express) | Sim |
| 5432 | PostgreSQL | Sim |
| 6379 | Redis | Sim |

## Sistemas Operacionais Suportados

### Desenvolvimento
- **macOS**: 12.0+ (Monterey ou superior)
- **Linux**: Ubuntu 20.04+, Debian 11+, Fedora 36+
- **Windows**: 10/11 com WSL2

### Producao
- **Linux**: Ubuntu 22.04 LTS (recomendado)
- **Linux**: Debian 12
- **Docker**: Qualquer host com Docker Engine

## Navegadores Suportados

O frontend do ChatBlue suporta os seguintes navegadores:

| Navegador | Versao Minima |
|-----------|---------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

:::warning Aviso
Internet Explorer nao e suportado.
:::

## Servicos Externos (Opcionais)

### Integracoes

| Servico | Proposito | Obrigatorio |
|---------|-----------|-------------|
| OpenAI API | IA para atendimento | Nao |
| Anthropic API | IA para atendimento | Nao |
| Notion API | Sincronizacao de clientes | Nao |
| Meta Cloud API | WhatsApp oficial | Nao |

### Infraestrutura

| Servico | Proposito | Recomendacao |
|---------|-----------|--------------|
| Let's Encrypt | Certificados SSL | Producao |
| Cloudflare | CDN e protecao | Producao |
| AWS/GCP/Azure | Cloud hosting | Producao |

## Verificacao de Requisitos

Execute os seguintes comandos para verificar se seu ambiente atende aos requisitos:

```bash
# Verificar Node.js
node --version
# Esperado: v18.0.0 ou superior

# Verificar pnpm
pnpm --version
# Esperado: 8.0.0 ou superior

# Verificar Docker
docker --version
# Esperado: Docker version 20.10 ou superior

# Verificar Docker Compose
docker compose version
# Esperado: Docker Compose version v2.0 ou superior

# Verificar Git
git --version
# Esperado: git version 2.30 ou superior
```

## Proximos Passos

Apos verificar que seu ambiente atende aos requisitos, siga para:

- [Configuracao de Desenvolvimento](/instalacao/desenvolvimento)
- [Configuracao com Docker](/instalacao/docker)
- [Variaveis de Ambiente](/instalacao/variaveis-ambiente)
