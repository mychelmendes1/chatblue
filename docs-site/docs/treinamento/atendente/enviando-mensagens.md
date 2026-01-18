---
sidebar_position: 3
title: Enviando Mensagens
description: Aprenda a enviar todos os tipos de mensagens
---

# Enviando Mensagens

Neste capitulo, voce aprendera a enviar diferentes tipos de mensagens e usar recursos que agilizam seu atendimento.

## Mensagens de Texto

### Enviando Texto Simples

1. Clique no campo "Digite sua mensagem..."
2. Escreva sua mensagem
3. Pressione **Enter** ou clique no botao **Enviar**

```
┌─────────────────────────────────────────────────────────────────┐
│ Ola Maria! Como posso ajudar voce hoje?                    [➤] │
└─────────────────────────────────────────────────────────────────┘
```

### Quebra de Linha

Para escrever mensagens com multiplas linhas:
- Pressione **Shift + Enter** para pular linha
- Continue digitando
- Pressione **Enter** para enviar

**Exemplo:**
```
Ola Maria!

Verificamos seu pedido #12345.
Ele esta em transito e deve chegar amanha.

Qualquer duvida, estamos a disposicao!
```

### Formatacao de Texto

O WhatsApp suporta formatacao basica:

| Formato | Como fazer | Resultado |
|---------|------------|-----------|
| **Negrito** | `*texto*` | **texto** |
| *Italico* | `_texto_` | _texto_ |
| ~~Riscado~~ | `~texto~` | ~~texto~~ |
| `Monoespaco` | ``` `texto` ``` | `texto` |

**Exemplo:**
```
*Importante:* Seu codigo de rastreio e _ABC123456_
```

---

## Emojis

### Usando o Seletor de Emojis

1. Clique no botao 😊 ao lado do campo de texto
2. Navegue pelas categorias ou busque
3. Clique no emoji desejado

### Categorias Disponiveis

- 😀 Rostos e Emocoes
- 👋 Pessoas e Corpo
- 🐶 Animais e Natureza
- 🍕 Comidas e Bebidas
- ⚽ Atividades
- 🚗 Viagens e Lugares
- 💡 Objetos
- ❤️ Simbolos

### Emojis Mais Usados no Atendimento

| Emoji | Quando usar |
|-------|-------------|
| 👋 | Saudacao inicial |
| 😊 | Demonstrar simpatia |
| ✅ | Confirmar algo |
| 📦 | Falar sobre pedidos |
| 📞 | Indicar contato telefonico |
| ⏰ | Falar sobre prazos |
| 💳 | Falar sobre pagamentos |
| 🎉 | Celebrar algo positivo |

:::tip Uso Moderado
Use emojis para humanizar a conversa, mas nao exagere. 1-2 emojis por mensagem e suficiente.
:::

---

## Enviando Midias

### Imagens

**Para enviar uma imagem:**

1. Clique no botao 📎 (anexo)
2. Selecione "Imagem"
3. Escolha o arquivo do seu computador
4. Adicione uma legenda (opcional)
5. Clique em "Enviar"

**Formatos aceitos:** JPG, PNG, GIF, WebP
**Tamanho maximo:** 16MB

### Audios

**Para enviar um audio:**

1. Clique no botao 📎 (anexo)
2. Selecione "Audio"
3. Escolha o arquivo de audio

**Formatos aceitos:** MP3, OGG, AAC, M4A
**Tamanho maximo:** 16MB

:::info Gravar Audio
Alguns sistemas permitem gravar audio diretamente. Verifique se o botao de microfone esta disponivel.
:::

### Videos

**Para enviar um video:**

1. Clique no botao 📎 (anexo)
2. Selecione "Video"
3. Escolha o arquivo de video
4. Aguarde o upload (pode demorar)

**Formatos aceitos:** MP4, 3GP
**Tamanho maximo:** 16MB

### Documentos

**Para enviar documentos:**

1. Clique no botao 📎 (anexo)
2. Selecione "Documento"
3. Escolha o arquivo

**Formatos aceitos:** PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
**Tamanho maximo:** 100MB

### Boas Praticas para Midias

:::tip Otimize Imagens
Antes de enviar, verifique se a imagem nao esta muito pesada. Imagens menores enviam mais rapido.
:::

:::caution Informacoes Sensiveis
Nunca envie documentos com dados sensiveis de outros clientes ou da empresa.
:::

:::warning Direitos Autorais
Nao envie imagens ou videos protegidos por direitos autorais sem autorizacao.
:::

---

## Respostas Rapidas

Respostas rapidas sao mensagens pre-configuradas que voce pode enviar com poucos cliques.

### Usando Respostas Rapidas

1. Digite `/` no campo de mensagem
2. Aparecera uma lista de respostas disponiveis
3. Digite para filtrar ou use as setas
4. Pressione **Enter** para selecionar

**Exemplo:**
```
/saudacao    →   Ola! Seja bem-vindo ao atendimento da [Empresa].
                 Como posso ajudar voce hoje?

/despedida   →   Foi um prazer atender voce! Se tiver mais duvidas,
                 estamos a disposicao. Tenha um otimo dia! 😊

/aguarde     →   Um momento, por favor. Estou verificando essa
                 informacao para voce.
```

### Respostas Rapidas Comuns

| Comando | Situacao |
|---------|----------|
| `/saudacao` | Iniciar atendimento |
| `/aguarde` | Pedir para o cliente esperar |
| `/verificando` | Informar que esta analisando |
| `/pedido` | Informacoes sobre pedidos |
| `/pagamento` | Informacoes sobre pagamentos |
| `/horario` | Horario de funcionamento |
| `/despedida` | Encerrar atendimento |

### Variaveis nas Respostas

Algumas respostas rapidas usam variaveis:

- `{nome}` - Nome do cliente
- `{protocolo}` - Numero do ticket
- `{empresa}` - Nome da empresa
- `{atendente}` - Seu nome

**Exemplo:**
```
/boasvindas  →   Ola {nome}! Eu sou o {atendente} e vou te
                 ajudar hoje. Seu protocolo e {protocolo}.
```

---

## Citando Mensagens

Voce pode citar uma mensagem anterior para dar contexto:

### Como Citar

1. Passe o mouse sobre a mensagem que quer citar
2. Clique no icone de resposta (↩️)
3. A mensagem aparecera citada no campo de texto
4. Escreva sua resposta
5. Envie

**Visualizacao:**
```
┌─────────────────────────────────────────┐
│ │ Cliente: Qual o prazo de entrega?     │
│ └───────────────────────────────────────│
│ O prazo e de 3 a 5 dias uteis apos      │
│ confirmacao do pagamento.               │
└─────────────────────────────────────────┘
```

:::tip Quando Citar
Cite mensagens quando a conversa tiver muitas mensagens e voce precisar deixar claro a qual pergunta esta respondendo.
:::

---

## Reagindo a Mensagens

Voce pode reagir a mensagens com emojis:

### Como Reagir

1. Passe o mouse sobre a mensagem
2. Clique no icone de reacao (😊)
3. Escolha um emoji

### Emojis de Reacao Disponiveis

👍 👎 ❤️ 😂 😮 😢

:::info Uso de Reacoes
Reacoes sao uteis para confirmar que voce viu uma mensagem ou demonstrar empatia rapidamente.
:::

---

## Mensagens Internas

Mensagens internas sao visiveis apenas para a equipe, nao para o cliente.

### Como Enviar Mensagem Interna

1. Clique no botao "Nota Interna" 📝
2. Escreva sua mensagem
3. Envie

**Visualizacao:**
```
┌─────────────────────────────────────────┐
│ 📝 NOTA INTERNA - Joao Silva            │
│ Cliente ja reclamou 3x sobre o mesmo    │
│ problema. Priorizar resolucao.          │
│                              14:32      │
└─────────────────────────────────────────┘
```

### Quando Usar Mensagens Internas

- Deixar informacoes para o proximo atendente
- Registrar detalhes importantes
- Alertar sobre situacoes especiais
- Documentar decisoes tomadas

---

## Templates de Mensagens

Templates sao mensagens mais complexas, geralmente aprovadas previamente.

### Usando Templates

1. Clique no botao "Templates" 📋
2. Escolha o template adequado
3. Preencha os campos variaveis (se houver)
4. Revise e envie

### Tipos de Templates

| Tipo | Uso |
|------|-----|
| **Boas-vindas** | Primeiro contato |
| **Confirmacao** | Confirmar informacoes |
| **Notificacao** | Avisar sobre algo |
| **Lembrete** | Lembrar o cliente |
| **Promocional** | Ofertas e promocoes |

:::warning Templates Oficiais
Para conexoes oficiais (Meta Cloud API), apenas templates aprovados pela Meta podem ser usados para iniciar conversas.
:::

---

## Boas Praticas de Escrita

### O Que Fazer

✅ Use linguagem clara e simples
✅ Seja cordial e profissional
✅ Personalize usando o nome do cliente
✅ Releia antes de enviar
✅ Use paragrafos curtos
✅ Responda todas as perguntas do cliente

### O Que Evitar

❌ Girias e abreviacoes excessivas
❌ ESCREVER EM MAIUSCULAS (parece gritar)
❌ Erros de portugues
❌ Mensagens muito longas
❌ Respostas monossilabicas (ok, sim, nao)
❌ Demorar para responder

### Exemplos

**Ruim:**
```
n sei, vou ver
```

**Bom:**
```
Vou verificar essa informacao para voce. Um momento, por favor!
```

**Ruim:**
```
SEU PEDIDO VAI CHEGAR AMANHA OK
```

**Bom:**
```
Otima noticia, Maria! Seu pedido esta a caminho e a previsao de entrega e amanha. 📦
```

---

## Exercicios Praticos

### Exercicio 1: Formatacao
Escreva uma mensagem usando negrito, italico e emojis:
- Cumprimente o cliente
- Destaque uma informacao importante em negrito
- Use 1-2 emojis apropriados

### Exercicio 2: Respostas Rapidas
1. Descubra quais respostas rapidas estao disponiveis
2. Use 3 respostas rapidas diferentes
3. Observe como as variaveis sao preenchidas

### Exercicio 3: Midia
1. Envie uma imagem com legenda
2. Envie um documento PDF
3. Pratique citar mensagens

---

## Proximo Passo

Agora que voce sabe enviar mensagens, vamos aprender a gerenciar seus tickets:

**[Gerenciando Tickets →](/treinamento/atendente/gerenciando-tickets)**
