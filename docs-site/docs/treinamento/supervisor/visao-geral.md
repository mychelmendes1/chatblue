---
sidebar_position: 1
title: Visao Geral do Supervisor
description: Conheca o papel do supervisor no ChatBlue e suas principais responsabilidades
---

# Visao Geral do Supervisor

Bem-vindo ao manual do supervisor! Este guia foi criado para ajudar voce a entender seu papel no ChatBlue e como utilizar as ferramentas disponiveis para gerenciar sua equipe de forma eficiente.

## O Que e um Supervisor no ChatBlue?

O supervisor e o profissional responsavel por **coordenar e monitorar** a equipe de atendentes, garantindo que os clientes recebam um atendimento de qualidade dentro dos prazos estabelecidos (SLA).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Hierarquia do ChatBlue                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌─────────────────┐                                │
│                          │  Administrador  │                                │
│                          │    (Admin)      │                                │
│                          └────────┬────────┘                                │
│                                   │                                          │
│                                   │ Configura o sistema                      │
│                                   │                                          │
│                          ┌────────▼────────┐                                │
│                          │   SUPERVISOR    │  ◄── VOCE ESTA AQUI            │
│                          │                 │                                │
│                          └────────┬────────┘                                │
│                                   │                                          │
│                                   │ Gerencia a equipe                        │
│                                   │                                          │
│          ┌────────────────────────┼────────────────────────┐                │
│          │                        │                        │                │
│  ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐        │
│  │   Atendente   │       │   Atendente   │       │   Atendente   │        │
│  │    Maria      │       │     Joao      │       │      Ana      │        │
│  └───────────────┘       └───────────────┘       └───────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Suas Responsabilidades

Como supervisor, voce tem cinco responsabilidades principais:

### 1. Monitorar a Equipe em Tempo Real

- Acompanhar quais atendentes estao online, ocupados ou ausentes
- Verificar a carga de trabalho de cada atendente
- Identificar gargalos no atendimento

### 2. Garantir o Cumprimento do SLA

- Monitorar tickets que estao proximos de estourar o prazo
- Intervir quando necessario para evitar violacoes
- Analisar causas de atrasos

### 3. Redistribuir Atendimentos

- Transferir tickets entre atendentes quando necessario
- Balancear a carga de trabalho da equipe
- Assumir tickets criticos quando preciso

### 4. Apoiar Atendentes em Casos Dificeis

- Auxiliar em atendimentos complexos
- Aprovar descontos ou excecoes
- Mediar conflitos com clientes

### 5. Analisar Metricas e Gerar Relatorios

- Acompanhar indicadores de desempenho
- Identificar oportunidades de melhoria
- Reportar resultados para a gestao

## O Que Voce Pode Fazer no Sistema

| Funcionalidade | Descricao |
|----------------|-----------|
| Ver Dashboard | Acessar painel com metricas em tempo real |
| Monitorar Agentes | Ver status e carga de trabalho dos atendentes |
| Visualizar Tickets | Ver todos os tickets da sua equipe |
| Transferir Tickets | Mover tickets entre atendentes ou departamentos |
| Assumir Tickets | Pegar um ticket para si quando necessario |
| Gerar Relatorios | Criar relatorios de desempenho |
| Ver Historico | Acessar conversas anteriores para auditoria |
| Enviar Mensagens | Responder em nome de um atendente |

:::info O Que Voce NAO Pode Fazer
Algumas funcoes sao exclusivas do Administrador:
- Criar ou excluir usuarios
- Configurar conexoes WhatsApp
- Alterar configuracoes do sistema
- Configurar IA e automacoes
:::

## Sua Tela Principal

Ao fazer login, voce vera a tela do dashboard com uma visao geral da operacao:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ChatBlue                          [Notificacoes 🔔]    [Maria - Supervisor]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────┐                                                             │
│  │ Dashboard  │ ◄── Visao geral das metricas                               │
│  ├────────────┤                                                             │
│  │ Tickets    │ ◄── Lista de todos os tickets                              │
│  ├────────────┤                                                             │
│  │ Equipe     │ ◄── Status dos atendentes                                  │
│  ├────────────┤                                                             │
│  │ Relatorios │ ◄── Relatorios e exportacoes                               │
│  ├────────────┤                                                             │
│  │ Contatos   │ ◄── Base de clientes                                       │
│  └────────────┘                                                             │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │                    AREA DE CONTEUDO PRINCIPAL                         │  │
│  │                                                                       │  │
│  │          (Muda conforme o menu selecionado)                          │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Fluxo de Trabalho Diario

Recomendamos seguir esta rotina para manter a operacao sob controle:

### Inicio do Turno

1. **Faca login no sistema** e acesse o Dashboard
2. **Verifique o resumo da noite/turno anterior**
   - Quantos tickets ficaram pendentes?
   - Houve violacoes de SLA?
3. **Confira quais atendentes estao online**
   - Alguem faltou?
   - Precisa redistribuir tickets?

### Durante o Turno

4. **Monitore o dashboard a cada 30 minutos**
   - Verifique tickets em risco de SLA
   - Acompanhe tempo de resposta
5. **Apoie atendentes quando solicitado**
   - Fique atento as notificacoes
   - Responda rapidamente a pedidos de ajuda
6. **Redistribua tickets se necessario**
   - Equilibre a carga entre os atendentes

### Fim do Turno

7. **Verifique tickets pendentes**
   - Algum precisa de atencao urgente?
8. **Gere relatorio do dia** (se aplicavel)
9. **Registre ocorrencias importantes**
   - Problemas tecnicos
   - Clientes insatisfeitos
   - Sugestoes de melhoria

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Rotina Diaria do Supervisor                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   08:00  ─────●───── Login e revisao do turno anterior                      │
│                │                                                             │
│   08:30  ─────●───── Verificar equipe online e distribuir tickets           │
│                │                                                             │
│   09:00  ─────●───── Monitoramento ativo (repetir a cada 30 min)            │
│                │                                                             │
│   12:00  ─────●───── Verificar cobertura do almoco                          │
│                │                                                             │
│   14:00  ─────●───── Revisao de metricas da manha                           │
│                │                                                             │
│   17:00  ─────●───── Preparar passagem de turno / fechamento                │
│                │                                                             │
│   18:00  ─────●───── Gerar relatorio do dia                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dicas para um Bom Desempenho

:::tip Seja Proativo
Nao espere os problemas acontecerem. Monitore constantemente e antecipe-se a possiveis violacoes de SLA.
:::

:::tip Conheca sua Equipe
Entenda os pontos fortes e fracos de cada atendente. Alguns sao melhores com clientes dificeis, outros sao mais tecnicos.
:::

:::tip Documente Tudo
Registre ocorrencias importantes. Isso ajuda a identificar padroes e melhorar processos.
:::

:::caution Atencao aos Alertas
O sistema envia alertas quando tickets estao proximos de estourar o SLA. Nao ignore essas notificacoes!
:::

## Indicadores que Voce Deve Acompanhar

| Indicador | O Que E | Meta Ideal |
|-----------|---------|------------|
| SLA Cumprido | % de tickets respondidos no prazo | > 95% |
| Tempo Medio de Resposta | Tempo ate a primeira resposta | < 10 min |
| Tempo de Resolucao | Tempo total para resolver | < 2 horas |
| Avaliacao do Cliente | Nota dada pelo cliente | > 4.5/5 |
| Tickets por Hora | Produtividade da equipe | Varia |

## Proximos Passos

Agora que voce conhece seu papel, vamos aprender a usar cada ferramenta:

1. **[Dashboard](/treinamento/supervisor/dashboard)** - Aprenda a interpretar o painel de metricas
2. **[Gestao de Equipe](/treinamento/supervisor/gestao-equipe)** - Como monitorar e apoiar sua equipe
3. **[SLA e Qualidade](/treinamento/supervisor/sla-qualidade)** - Entenda e gerencie os acordos de nivel de servico
4. **[Relatorios](/treinamento/supervisor/relatorios)** - Gere e analise relatorios de desempenho

---

:::info Precisa de Ajuda?
Se tiver duvidas sobre alguma funcao, consulte seu administrador ou entre em contato com o suporte do ChatBlue.
:::
