#!/bin/bash
# =============================================================================
# Adiciona as variáveis de Google OAuth2 ao .env de produção
# Uso: bash scripts/add-google-oauth-env.sh
# =============================================================================

set -euo pipefail

ENV_FILE="/opt/chatblue/.env"
SERVER_HOST="${SERVER_HOST:-84.247.191.105}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"

echo "=========================================="
echo "  ChatBlue - Configurar Google OAuth2"
echo "=========================================="
echo ""

# Solicita as credenciais se não foram passadas via env
if [ -z "${GOOGLE_CLIENT_ID:-}" ]; then
  read -p "Google Client ID: " GOOGLE_CLIENT_ID
fi

if [ -z "${GOOGLE_CLIENT_SECRET:-}" ]; then
  read -s -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
  echo ""
fi

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Client ID e Client Secret são obrigatórios."
  exit 1
fi

echo ""
echo "Servidor: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"
echo "Arquivo:  ${ENV_FILE}"
echo ""

read -p "Deseja continuar? (s/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "Conectando ao servidor..."

ssh -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_HOST}" bash -s <<REMOTE_SCRIPT
set -euo pipefail

ENV_FILE="${ENV_FILE}"

# Remove entradas antigas se existirem
if grep -q "GOOGLE_CLIENT_ID" "\$ENV_FILE" 2>/dev/null; then
  echo "Removendo entradas antigas de GOOGLE_CLIENT_ID/SECRET..."
  sed -i '/^GOOGLE_CLIENT_ID=/d' "\$ENV_FILE"
  sed -i '/^GOOGLE_CLIENT_SECRET=/d' "\$ENV_FILE"
  sed -i '/^# Google OAuth2/d' "\$ENV_FILE"
fi

# Adiciona as novas variáveis
echo "" >> "\$ENV_FILE"
echo "# Google OAuth2 (Gmail Workspace)" >> "\$ENV_FILE"
echo 'GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"' >> "\$ENV_FILE"
echo 'GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}"' >> "\$ENV_FILE"

echo "✅ Variáveis adicionadas ao \$ENV_FILE"

# Verifica
echo ""
echo "Verificando..."
grep "GOOGLE_" "\$ENV_FILE"

# Restart da API para carregar as novas variáveis
echo ""
echo "Reiniciando API..."
cd /opt/chatblue/app
pm2 restart chatblue-api --update-env 2>/dev/null || echo "⚠️  pm2 restart falhou (verifique manualmente)"

echo ""
echo "✅ Configuração concluída!"
REMOTE_SCRIPT

echo ""
echo "=========================================="
echo "  ✅ Google OAuth2 configurado em produção"
echo "=========================================="
