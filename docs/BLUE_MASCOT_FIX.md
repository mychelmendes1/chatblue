# Correção do Problema do Blue Mascot em Produção

## Problema Identificado

O Blue Mascot não estava aparecendo em produção porque:

1. **Rota `/api/settings` requer permissões de Admin**: A rota GET `/api/settings` tinha o middleware `requireAdmin`, que bloqueava o acesso de usuários não-admin.

2. **Componente BlueMascot tenta acessar `/api/settings`**: O componente faz uma requisição para verificar se `blueEnabled` está ativado, mas usuários normais não conseguem acessar essa rota.

3. **Resultado**: A requisição falha com erro 403 (Forbidden), o componente não consegue determinar se o Blue está habilitado e fica invisível.

## Solução Implementada

### Mudança na Rota `/api/settings`

**Antes:**
```typescript
router.get('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  // Retorna configurações completas (apenas para admin)
});
```

**Depois:**
```typescript
// Rota pública - retorna apenas configurações seguras
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  // Retorna configurações com dados sensíveis ocultos
});

// Nova rota admin - retorna configurações completas
router.get('/admin', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  // Retorna configurações completas (apenas para admin)
});
```

### O que foi alterado:

1. **Rota `/api/settings`** agora é acessível para todos os usuários autenticados, mas retorna apenas dados não-sensíveis (chaves de API são ocultadas).

2. **Nova rota `/api/settings/admin`** foi criada para administradores que precisam ver/editar configurações completas.

3. **Segurança mantida**: Dados sensíveis (chaves de API) continuam ocultos na rota pública.

## Próximos Passos para Deploy

1. **Compilar o backend**:
   ```bash
   cd apps/api
   npm run build
   ```

2. **Deploy no servidor**:
   ```bash
   # Copiar arquivo atualizado
   scp apps/api/src/routes/settings.routes.ts root@84.247.191.105:/opt/chatblue/app/apps/api/src/routes/
   
   # Compilar no servidor
   ssh root@84.247.191.105
   cd /opt/chatblue/app/apps/api
   npm run build
   
   # Reiniciar PM2
   pm2 restart chatblue-api
   ```

3. **Verificar logs**:
   ```bash
   pm2 logs chatblue-api --lines 50
   ```

## Verificação

Após o deploy, verificar:

1. O componente Blue Mascot deve aparecer para usuários não-admin quando `blueEnabled = true` na configuração da empresa.

2. A rota `/api/settings` deve retornar configurações com dados sensíveis ocultos para todos os usuários autenticados.

3. A rota `/api/settings/admin` deve retornar configurações completas apenas para admins.

## Arquivos Alterados

- `apps/api/src/routes/settings.routes.ts`: Removido `requireAdmin` da rota GET `/` e criada nova rota `/admin` para admins.


