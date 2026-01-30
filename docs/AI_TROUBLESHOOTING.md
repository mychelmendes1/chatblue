# Diagnóstico e Solução de Problemas da IA

Este documento descreve os problemas comuns que impedem a IA de funcionar e como resolvê-los.

## 🔍 Script de Diagnóstico

Execute o script de diagnóstico para identificar problemas:

```bash
cd apps/api
pnpm diagnose:ai
```

Este script verifica:
1. ✅ Se a IA está habilitada nas configurações da empresa
2. ✅ Se a API Key está configurada
3. ✅ Se o provedor AI está configurado
4. ✅ Se existe usuário IA criado
5. ✅ Se o usuário IA está ativo
6. ✅ Se o usuário IA tem `aiConfig` configurado
7. ✅ Status dos tickets recentes

## 🚨 Problemas Comuns e Soluções

### 1. IA não está habilitada nas configurações

**Sintoma:** A IA não responde a nenhuma mensagem.

**Diagnóstico:**
- Verifique se `aiEnabled = true` na tabela `company_settings`
- Execute o script de diagnóstico: `pnpm diagnose:ai`

**Solução:**
1. Acesse a interface web: `Configurações > IA`
2. Ative a opção "IA Habilitada"
3. Salve as configurações

### 2. API Key não configurada

**Sintoma:** Logs mostram: `AI: API Key não configurada para companyId X`

**Diagnóstico:**
```sql
SELECT ai_enabled, ai_api_key, ai_provider 
FROM company_settings 
WHERE company_id = 'SEU_COMPANY_ID';
```

**Solução:**
1. Obtenha uma API Key:
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Anthropic**: https://console.anthropic.com/settings/keys
2. Acesse: `Configurações > IA`
3. Configure a API Key
4. Selecione o Provedor (OpenAI ou Anthropic)
5. Salve as configurações

### 3. Usuário IA não existe ou está inativo

**Sintoma:** Tickets não são atribuídos à IA ou logs mostram: `AI: Ticket não está atribuído a nenhum usuário`

**Diagnóstico:**
```sql
SELECT id, name, email, is_ai, is_active, ai_config 
FROM users 
WHERE is_ai = true AND company_id = 'SEU_COMPANY_ID';
```

**Solução:**
1. Acesse: `Configurações > Agente IA`
2. Crie um novo agente IA ou edite existente
3. Configure:
   - Nome e Email
   - Modelo AI (ex: `gpt-4-turbo-preview` ou `claude-sonnet-4-20250514`)
   - System Prompt
   - Temperature e Max Tokens
4. **Importante**: Ative o usuário IA (`isActive = true`)

### 4. Usuário IA não tem `aiConfig`

**Sintoma:** Logs mostram: `AI: usuário não tem aiConfig configurado`

**Diagnóstico:**
- O campo `aiConfig` está vazio/null no usuário IA

**Solução:**
1. Acesse: `Configurações > Agente IA`
2. Edite o usuário IA
3. Preencha todos os campos obrigatórios:
   - Modelo AI
   - System Prompt
   - Configurações de personalidade
4. Salve

### 5. Ticket não está atribuído à IA

**Sintoma:** Mensagens não são processadas pela IA

**Diagnóstico:**
```sql
SELECT t.id, t.protocol, t.is_ai_handled, u.name, u.is_ai, u.is_active
FROM tickets t
LEFT JOIN users u ON t.assigned_to_id = u.id
WHERE t.company_id = 'SEU_COMPANY_ID' 
  AND t.status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
ORDER BY t.updated_at DESC
LIMIT 10;
```

**Solução:**
- Os tickets novos devem ser automaticamente atribuídos à IA se houver um usuário IA ativo
- Se não estiver sendo atribuído, verifique:
  1. Existe usuário IA ativo? (`isAI = true AND isActive = true`)
  2. O ticket está sendo criado corretamente?
  3. Verifique os logs do `MessageProcessor`

### 6. Provedor AI incompatível com modelo

**Sintoma:** Erros ao gerar respostas da IA

**Diagnóstico:**
- OpenAI models: `gpt-4-*`, `gpt-3.5-*`
- Anthropic models: `claude-*`
- Se usar modelo OpenAI com provedor Anthropic (ou vice-versa), ocorrerá erro

**Solução:**
1. Verifique o provedor configurado em `company_settings.ai_provider`
2. Verifique o modelo do agente IA em `users.ai_config->>'model'`
3. Ajuste para usar modelos compatíveis:
   - OpenAI: use modelos `gpt-*`
   - Anthropic: use modelos `claude-*`

## 📋 Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] IA habilitada em `Configurações > IA`
- [ ] API Key configurada e válida
- [ ] Provedor AI selecionado (OpenAI ou Anthropic)
- [ ] Usuário IA criado em `Configurações > Agente IA`
- [ ] Usuário IA está **ativo** (`isActive = true`)
- [ ] Usuário IA tem `aiConfig` preenchido
- [ ] Modelo AI é compatível com o provedor
- [ ] Ticket está atribuído ao usuário IA
- [ ] Logs não mostram erros relacionados à IA

## 🔧 Logs Detalhados

O sistema agora registra logs detalhados quando a IA não processa uma mensagem. Verifique os logs para mensagens como:

```
AI: IA não está habilitada para companyId X
AI: API Key não configurada para companyId X
AI: Ticket X não está atribuído a nenhum usuário
AI: usuário não tem aiConfig configurado
```

## 🛠️ Correções Automáticas

Se identificou o problema, pode corrigir diretamente no banco (use com cuidado):

```sql
-- Habilitar IA
UPDATE company_settings 
SET ai_enabled = true, 
    ai_provider = 'openai',  -- ou 'anthropic'
    ai_api_key = 'sua-api-key-aqui'
WHERE company_id = 'SEU_COMPANY_ID';

-- Ativar usuário IA
UPDATE users 
SET is_active = true 
WHERE is_ai = true AND company_id = 'SEU_COMPANY_ID';

-- Verificar configuração
SELECT * FROM company_settings WHERE company_id = 'SEU_COMPANY_ID';
SELECT id, name, email, is_ai, is_active, ai_config FROM users WHERE is_ai = true;
```

## 📞 Suporte

Se após seguir todos os passos a IA ainda não funcionar:

1. Execute `pnpm diagnose:ai` e compartilhe o output
2. Verifique os logs da aplicação para erros específicos
3. Verifique se a API Key é válida testando diretamente com o provedor
4. Verifique se há limite de requisições/quota excedida na API






