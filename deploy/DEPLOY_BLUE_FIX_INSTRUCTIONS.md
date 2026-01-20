# Instruções de Deploy - Correção do Blue Mascot

## Problema
A rota `/api/settings` requer `requireAdmin`, mas o componente `BlueMascot` precisa acessá-la para verificar se o Blue está habilitado. Isso causa erro 403 para usuários não-admin e o mascote não aparece.

## Solução
Remover `requireAdmin` da rota GET `/` e criar nova rota `/admin` para administradores.

## Arquivo Alterado
- `apps/api/src/routes/settings.routes.ts`

## Status
✅ Arquivo corrigido localmente
✅ Arquivo copiado para `/tmp/settings.routes.ts` no servidor
⏳ Aguardando acesso ao servidor para completar deploy

## Deploy Manual (quando servidor estiver acessível)

Execute os seguintes comandos no servidor:

```bash
# 1. Backup do arquivo atual
cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts \
   /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup

# 2. Copiar arquivo corrigido
cp /tmp/settings.routes.ts \
   /opt/chatblue/app/apps/api/src/routes/settings.routes.ts

# 3. Verificar arquivo
head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings'

# 4. Compilar (pode ter erros pré-existentes, mas deve compilar settings.routes.ts)
cd /opt/chatblue/app/apps/api && npm run build

# 5. Verificar se compilou
ls -la /opt/chatblue/app/apps/api/dist/routes/settings.routes.js

# 6. Reiniciar API
pm2 restart chatblue-api --update-env

# 7. Verificar logs
pm2 logs chatblue-api --lines 20 --nostream | tail -20

# 8. Verificar status
pm2 status
```

## Mudanças no Código

**Antes:**
```typescript
router.get('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
```

**Depois:**
```typescript
// Rota pública - retorna apenas configurações seguras
router.get('/', authenticate, ensureTenant, async (req, res, next) => {

// Nova rota admin - retorna configurações completas
router.get('/admin', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
```

## Verificação Pós-Deploy

1. Acessar o sistema como usuário não-admin
2. O Blue Mascot deve aparecer no canto da tela quando `blueEnabled = true`
3. A rota `/api/settings` deve retornar 200 (não mais 403)
4. A rota `/api/settings/admin` deve retornar 200 apenas para admins


