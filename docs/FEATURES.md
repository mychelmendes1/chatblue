# ChatBlue - Funcionalidades Detalhadas

## 🎯 Funcionalidades Principais

---

### 1. Multi-Tenancy (Múltiplas Empresas)

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                          │
│         Gerencia todas as empresas                      │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Empresa A  │   │  Empresa B  │   │  Empresa C  │
│  - Admin    │   │  - Admin    │   │  - Admin    │
│  - Agentes  │   │  - Agentes  │   │  - Agentes  │
│  - Conexões │   │  - Conexões │   │  - Conexões │
│  - Contatos │   │  - Contatos │   │  - Contatos │
└─────────────┘   └─────────────┘   └─────────────┘
```

**Características:**
- Cada empresa tem seu próprio espaço isolado
- Dados completamente separados (tenant isolation)
- Configurações independentes
- Múltiplas conexões WhatsApp por empresa
- Planos diferentes (Basic, Pro, Enterprise)

---

### 2. Interface Similar ao WhatsApp

```
┌──────────────────────────────────────────────────────────────────┐
│  🟢 ChatBlue          ⚙️ 👤 Configurações                         │
├─────────────────────┬────────────────────────────────────────────┤
│ 🔍 Buscar conversas │  ┌──────────────────────────────────────┐  │
├─────────────────────┤  │ João Silva              📞 Ver Info  │  │
│                     │  │ +55 11 99999-0000                    │  │
│ ┌─────────────────┐ │  │ Cliente | Comercial                  │  │
│ │ 🤖 Maria (IA)   │ │  ├──────────────────────────────────────┤  │
│ │ Oi, tudo bem?   │ │  │                                      │  │
│ │ 10:30 ✓✓        │ │  │     ┌─────────────────────┐          │  │
│ └─────────────────┘ │  │     │ Olá! Preciso de     │          │  │
│                     │  │     │ ajuda com meu pedido│          │  │
│ ┌─────────────────┐ │  │     └─────────────────────┘ 10:28    │  │
│ │ 👤 Pedro Santos │ │  │                                      │  │
│ │ 🟡 Aguardando   │ │  │  ┌─────────────────────────┐         │  │
│ │ 09:45           │ │  │  │ Claro! Pode me passar  │         │  │
│ └─────────────────┘ │  │  │ o número do pedido?    │         │  │
│                     │  │  └─────────────────────────┘ 10:30 ✓✓│  │
│ ┌─────────────────┐ │  │                                      │  │
│ │ 👤 Ana Costa    │ │  │  [ASSUMIR CONVERSA]                  │  │
│ │ 🟢 Em atendim.  │ │  │                                      │  │
│ │ 08:20           │ │  ├──────────────────────────────────────┤  │
│ └─────────────────┘ │  │ 📎  Digite uma mensagem...      📤   │  │
├─────────────────────┤  └──────────────────────────────────────┘  │
│ Filtros:            │                                            │
│ [Meus] [IA] [Fila]  │  📊 SLA: 12min restantes                   │
└─────────────────────┴────────────────────────────────────────────┘
```

**Elementos:**
- Lista de conversas à esquerda (sidebar)
- Janela de chat principal
- Painel de informações do contato
- Indicadores visuais de status
- Botão "Assumir Conversa"
- Timer de SLA visível

---

### 3. Hierarquia de Departamentos

```
                    ┌─────────────┐
                    │   TRIAGEM   │  ← IA atende inicialmente
                    │   (Nível 0) │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  COMERCIAL  │ │   SUPORTE   │ │ FINANCEIRO  │
    │  (Nível 1)  │ │  (Nível 1)  │ │  (Nível 1)  │
    └──────┬──────┘ └──────┬──────┘ └─────────────┘
           │               │
           ▼               ▼
    ┌─────────────┐ ┌─────────────┐
    │   VENDAS    │ │  TÉCNICO    │
    │  (Nível 2)  │ │  (Nível 2)  │
    └─────────────┘ └─────────────┘
```

**Regras de Visibilidade:**
- Atendente vê: suas conversas + conversas dos departamentos "acima"
- Exemplo: Atendente do Comercial vê conversas da Triagem
- Supervisores veem todas as conversas do departamento
- Botão "Assumir" disponível para conversas visíveis

---

### 4. Atendente de IA

```
┌──────────────────────────────────────────────────────────────┐
│                    ATENDENTE DE IA                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Nome: Maria (Assistente Virtual)                            │
│  Departamento: Triagem                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ CONFIGURAÇÃO                                             │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Provedor: OpenAI / Anthropic / Groq                     │ │
│  │ Modelo: gpt-4-turbo / claude-3-opus                     │ │
│  │ Temperatura: 0.7                                         │ │
│  │ Max Tokens: 500                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ PROMPT DO SISTEMA                                        │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Você é Maria, assistente virtual da Empresa X.          │ │
│  │ Seja educada e prestativa. Responda em português.       │ │
│  │                                                          │ │
│  │ Regras:                                                  │ │
│  │ - Se o cliente pedir para falar com humano, transfira   │ │
│  │ - Se detectar reclamação grave, transfira               │ │
│  │ - Sempre tente resolver dúvidas simples                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ GATILHOS DE TRANSFERÊNCIA                                │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ✓ Palavras-chave: "humano", "atendente", "reclamação"   │ │
│  │ ✓ Após 5 mensagens sem resolução                        │ │
│  │ ✓ Sentimento negativo detectado                         │ │
│  │ ✓ Cliente VIP (verificar no Notion)                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

### 5. Conexões WhatsApp

#### Baileys (Não-Oficial)
```
┌────────────────────────────────────────────────────────────┐
│  CONEXÃO BAILEYS                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Nome: WhatsApp Principal                                  │
│  Status: 🟢 Conectado                                      │
│  Número: +55 11 99999-0000                                │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │           [QR CODE AQUI]                          │   │
│  │                                                    │   │
│  │    Escaneie com seu WhatsApp para conectar       │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Desconectar] [Atualizar QR]                             │
│                                                            │
│  ⚠️ Conexão não-oficial. Use por sua conta e risco.       │
└────────────────────────────────────────────────────────────┘
```

#### Meta Cloud API (Oficial)
```
┌────────────────────────────────────────────────────────────┐
│  CONEXÃO META CLOUD API                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Nome: WhatsApp Business Oficial                           │
│  Status: 🟢 Conectado                                      │
│                                                            │
│  Phone Number ID: 1234567890                               │
│  Business ID: 0987654321                                   │
│  Access Token: ••••••••••••••••                           │
│  Webhook URL: https://api.empresa.com/webhook/meta        │
│                                                            │
│  ✅ Verificado pela Meta                                   │
│  ✅ Templates de mensagem disponíveis                      │
│                                                            │
│  [Testar Conexão] [Configurar Webhook]                    │
└────────────────────────────────────────────────────────────┘
```

---

### 6. Gestão de Contatos

```
┌────────────────────────────────────────────────────────────┐
│  CONTATO                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────┐  Nome: João da Silva                    [Editar]│
│  │ 👤   │  Telefone: +55 11 99999-0000                    │
│  │      │  Email: joao@email.com                  [Editar]│
│  └──────┘                                                  │
│                                                            │
│  ┌────────────────────────────────────────────────────────┤
│  │ NOTION                                                  │
│  ├────────────────────────────────────────────────────────┤
│  │ Status: 🟢 Cliente Ativo                               │
│  │ Desde: 15/03/2023                                      │
│  │ Plano: Premium                                         │
│  │ [Sincronizar com Notion]                               │
│  └────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────────┤
│  │ TAGS                                                    │
│  ├────────────────────────────────────────────────────────┤
│  │ [VIP] [Recorrente] [+ Adicionar]                       │
│  └────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────────┤
│  │ HISTÓRICO                                               │
│  ├────────────────────────────────────────────────────────┤
│  │ 📋 12 atendimentos                                     │
│  │ ⏱️ Tempo médio: 8 min                                  │
│  │ 📅 Último: há 2 dias                                   │
│  └────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

---

### 7. SLA e Métricas

```
┌────────────────────────────────────────────────────────────────────┐
│  DASHBOARD DE MÉTRICAS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │    127      │  │   3.2 min   │  │    94%      │  │    12       ││
│  │  Tickets    │  │    TMR      │  │ SLA Cumprido│  │  Em Fila    ││
│  │   Hoje      │  │ (Resposta)  │  │             │  │             ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ TICKETS POR HORA                                              │  │
│  │ 30│    ▄▄                                                     │  │
│  │ 20│ ▄▄ ██ ▄▄    ▄▄                                           │  │
│  │ 10│ ██ ██ ██ ▄▄ ██ ▄▄                                        │  │
│  │  0│ 08 09 10 11 12 13 14 15 16 17 18                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐    │
│  │ POR DEPARTAMENTO         │  │ POR ATENDENTE                │    │
│  ├──────────────────────────┤  ├──────────────────────────────┤    │
│  │ Comercial    ████░ 45    │  │ Maria (IA) ████████░ 78      │    │
│  │ Suporte      ███░░ 32    │  │ Pedro      ███░░░░░░ 23      │    │
│  │ Financeiro   ██░░░ 18    │  │ Ana        ██░░░░░░░ 15      │    │
│  │ Triagem      █░░░░ 8     │  │ Carlos     █░░░░░░░░ 11      │    │
│  └──────────────────────────┘  └──────────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SLA CRÍTICO (Próximos a vencer)                              │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 🔴 #1234 João Silva    - 2 min restantes   [Ver]            │  │
│  │ 🟡 #1235 Maria Santos  - 8 min restantes   [Ver]            │  │
│  │ 🟡 #1236 Pedro Alves   - 12 min restantes  [Ver]            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

### 8. Painel de Administração

```
┌────────────────────────────────────────────────────────────────────┐
│  ⚙️ ADMINISTRAÇÃO                                                   │
├─────────────────────┬──────────────────────────────────────────────┤
│                     │                                              │
│  📊 Dashboard       │  CONFIGURAÇÕES GERAIS                        │
│                     │  ─────────────────────────────────────────   │
│  👥 Usuários        │                                              │
│                     │  Nome da Empresa: [Empresa XYZ          ]   │
│  🏢 Departamentos   │                                              │
│                     │  Mensagem de Boas-vindas:                   │
│  📱 Conexões        │  [Olá! Bem-vindo ao atendimento...     ]   │
│                     │                                              │
│  🤖 Atendente IA    │  Mensagem de Ausência:                      │
│                     │  [No momento estamos fora do horário...]   │
│  🔗 Integrações     │                                              │
│    └─ Notion        │  ─────────────────────────────────────────   │
│    └─ Webhooks      │                                              │
│                     │  ATRIBUIÇÃO AUTOMÁTICA                       │
│  ⏱️ SLA             │  ─────────────────────────────────────────   │
│                     │                                              │
│  📋 Logs            │  ☑️ Ativar atribuição automática             │
│                     │  Máx. tickets por atendente: [10      ]     │
│  💾 Backup          │  Método: [Round-robin           ▼]          │
│                     │                                              │
│                     │  ─────────────────────────────────────────   │
│                     │                                              │
│                     │  [Salvar Configurações]                      │
└─────────────────────┴──────────────────────────────────────────────┘
```

---

## 🔄 Fluxos de Atendimento

### Fluxo 1: Nova Mensagem → IA → Humano

```
Cliente envia      Ticket criado     IA processa      IA responde
mensagem       →   na Triagem    →   mensagem     →   cliente
    │                                                    │
    │                                                    ▼
    │                                              Cliente satisfeito?
    │                                              Sim ─────────────────→ Fim
    │                                              Não
    │                                                    │
    │               Atendente vê       Atendente         ▼
    │               na fila        ←   clica em     ← Transfere para
    │                                  "Assumir"        humano
    │                                     │
    └─────────────────────────────────────┴──────────→ Atendimento
                                                        continua
```

### Fluxo 2: Escalonamento por Departamento

```
Triagem (IA)  →  Comercial  →  Vendas Especializadas
     │               │                    │
     │               │                    ▼
     │               │              Fechamento
     │               ▼
     │         Suporte  →  Suporte Técnico N2
     │               │
     ▼               ▼
Financeiro     Resolução
```

---

## 🎨 Design System

### Cores Principais
- **Verde WhatsApp**: #25D366 (ações principais)
- **Azul ChatBlue**: #0088CC (identidade)
- **Fundo escuro**: #111B21 (modo escuro)
- **Fundo claro**: #F0F2F5 (modo claro)

### Estados de Ticket
- 🔵 Pendente (azul)
- 🟡 Aguardando (amarelo)
- 🟢 Em Atendimento (verde)
- ✅ Resolvido (verde check)
- ⚫ Fechado (cinza)

### Indicadores de SLA
- 🟢 OK (> 50% tempo restante)
- 🟡 Atenção (20-50% tempo restante)
- 🔴 Crítico (< 20% tempo restante)
- ⚫ Violado (tempo excedido)
