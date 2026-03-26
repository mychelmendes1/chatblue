---
sidebar_position: 2
title: Publicar o site de documentacao
description: Como o Docusaurus em /docs/ e atualizado em producao
---

# Publicar o site de documentacao (`/docs/`)

O endereco **https://chat.grupoblue.com.br/docs/** e servido por ficheiros **estaticos** gerados pelo [Docusaurus](https://docusaurus.io/) (pasta `docs-site/` no repositorio). **Nao** faz parte do build do Next.js em producao — o proxy `/docs` no `next.config.js` existe apenas em **desenvolvimento**.

## Por que a doc online parece desatualizada?

1. O deploy da **aplicacao** (API + Web) **nao** republica automaticamente a documentacao.
2. O workflow **Deploy Documentacao** no GitHub Actions so corre quando:
   - ha `push` na branch `main` com alteracoes em `docs-site/**` ou em `.github/workflows/deploy-docs.yml`, **ou**
   - alguem dispara **manualmente** o workflow em **Actions**.

Se apenas mergeou codigo de `apps/api` ou `apps/web`, o site em `/docs/` continua na ultima versao que foi publicada por esse workflow.

## Como publicar a versao atual

1. No GitHub: **Actions** → **Deploy Documentacao** → **Run workflow** (branch `main`).
2. Aguardar o job **Build Docusaurus e publicar** concluir com sucesso.
3. Testar com atualizacao forcada no navegador (Ctrl+Shift+R) se necessario.

## Onde os ficheiros vao parar no servidor

O job faz `rsync` da pasta `docs-site/build/` para o caminho definido pelo secret **`DOCS_DEPLOY_PATH`** (padrao tipico: `/var/www/chatblue/docs`). O Nginx (ou outro servidor) deve servir esse diretorio em `/docs/`.

## Versao do gerador

O `docs-site` usa **Docusaurus 3.9.x** (ver `docs-site/package.json`). A **versao do conteudo** e a do ultimo commit em `docs-site/` que foi publicado pelo workflow acima.
