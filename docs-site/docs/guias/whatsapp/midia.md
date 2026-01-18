---
sidebar_position: 5
title: Midia no WhatsApp
description: Guia para enviar e receber arquivos de midia no ChatBlue
---

# Midia no WhatsApp

O ChatBlue suporta envio e recebimento de diversos tipos de midia pelo WhatsApp. Este guia explica como configurar e utilizar esses recursos.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 10-15 minutos

## Tipos de Midia Suportados

| Tipo | Extensoes | Tamanho Maximo | Descricao |
|------|-----------|----------------|-----------|
| Imagem | jpg, jpeg, png | 5 MB | Fotos e imagens |
| Video | mp4, 3gpp | 16 MB | Videos |
| Audio | aac, mp3, ogg, amr | 16 MB | Audios e mensagens de voz |
| Documento | pdf, doc, docx, xls, xlsx, ppt, pptx | 100 MB | Arquivos diversos |
| Sticker | webp | 500 KB | Figurinhas |
| Contato | vcard | - | Cartoes de contato |
| Localizacao | - | - | Coordenadas GPS |

## Configuracao Inicial

### Passo 1: Configurar Armazenamento

O ChatBlue suporta diferentes opcoes de armazenamento:

```typescript
// Configuracao em .env
STORAGE_TYPE=local          # local, s3, gcs
STORAGE_PATH=/uploads       # Caminho para armazenamento local

# Para Amazon S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=chatblue-media
AWS_S3_REGION=sa-east-1

# Para Google Cloud Storage
GCS_PROJECT_ID=your-project
GCS_BUCKET=chatblue-media
GCS_KEY_FILE=/path/to/key.json
```

### Passo 2: Configurar Limites

Ajuste os limites de upload conforme necessario:

```typescript
// config/media.ts
export const mediaConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  allowedTypes: {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    video: ['video/mp4', 'video/3gpp'],
    audio: ['audio/aac', 'audio/mp3', 'audio/ogg', 'audio/amr'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },
  compression: {
    image: {
      enabled: true,
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 80
    },
    video: {
      enabled: false // Requer ffmpeg
    }
  }
};
```

## Enviar Midia

### Via Interface

1. No chat, clique no icone de **anexo** (clipe)
2. Selecione o tipo de midia:
   - Imagem/Video da galeria
   - Documento
   - Contato
   - Localizacao
3. Selecione o arquivo
4. Adicione uma legenda (opcional)
5. Clique em **Enviar**

![Placeholder: Interface de envio de midia](/img/guias/midia-enviar.png)

### Via Arrastar e Soltar

1. Arraste o arquivo para a area do chat
2. Solte para fazer upload
3. Adicione legenda se desejar
4. Confirme o envio

### Via API

```typescript
// Enviar imagem
POST /api/messages/media
Content-Type: multipart/form-data

{
  "ticketId": "ticket_123",
  "type": "image",
  "file": [arquivo binario],
  "caption": "Confira nosso catalogo!"
}

// Enviar documento
POST /api/messages/media
{
  "ticketId": "ticket_123",
  "type": "document",
  "file": [arquivo binario],
  "filename": "contrato.pdf",
  "caption": "Segue o contrato para assinatura"
}

// Enviar por URL
POST /api/messages/media-url
{
  "ticketId": "ticket_123",
  "type": "image",
  "url": "https://exemplo.com/imagem.jpg",
  "caption": "Imagem do produto"
}
```

### Enviar Localizacao

```typescript
POST /api/messages/location
{
  "ticketId": "ticket_123",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "name": "Escritorio ChatBlue",
  "address": "Av. Paulista, 1000 - Sao Paulo, SP"
}
```

### Enviar Contato

```typescript
POST /api/messages/contact
{
  "ticketId": "ticket_123",
  "contact": {
    "name": {
      "formatted_name": "Joao Silva",
      "first_name": "Joao",
      "last_name": "Silva"
    },
    "phones": [
      {
        "phone": "+5511999998888",
        "type": "CELL"
      }
    ],
    "emails": [
      {
        "email": "joao@email.com",
        "type": "WORK"
      }
    ]
  }
}
```

## Receber Midia

### Download Automatico

Por padrao, o ChatBlue baixa automaticamente a midia recebida:

```typescript
// Configuracao de download automatico
{
  media: {
    autoDownload: {
      enabled: true,
      types: ['image', 'audio', 'document'],
      maxSize: 25 * 1024 * 1024 // 25 MB
    }
  }
}
```

### Visualizacao na Interface

- **Imagens**: Exibidas inline com preview
- **Videos**: Player integrado
- **Audios**: Player com controles
- **Documentos**: Icone com opcao de download

![Placeholder: Visualizacao de midia recebida](/img/guias/midia-receber.png)

### Webhook de Midia Recebida

```typescript
// Payload do webhook
{
  "event": "message.media",
  "data": {
    "ticketId": "ticket_123",
    "messageId": "msg_456",
    "from": "5511999998888",
    "media": {
      "type": "image",
      "mimeType": "image/jpeg",
      "url": "https://storage.chatblue.com/media/abc123.jpg",
      "filename": "foto.jpg",
      "size": 245678,
      "caption": "Foto do problema"
    }
  }
}
```

## Processamento de Midia

### Compressao de Imagens

O ChatBlue pode comprimir imagens automaticamente:

```typescript
// Compressao configuravel
{
  compression: {
    image: {
      enabled: true,
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 80,
      format: 'jpeg' // Converter para jpeg
    }
  }
}
```

### Geracao de Thumbnails

Thumbnails sao gerados automaticamente:

```typescript
{
  thumbnails: {
    enabled: true,
    sizes: [
      { name: 'small', width: 100, height: 100 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 800, height: 600 }
    ]
  }
}
```

### Transcricao de Audio

Audios podem ser transcritos automaticamente:

```typescript
{
  transcription: {
    enabled: true,
    provider: 'whisper',
    language: 'pt',
    autoTranscribe: true
  }
}
```

Veja mais em [Transcricao de Audio](/guias/inteligencia-artificial/transcricao).

## Armazenamento

### Local

```typescript
// Estrutura de pastas
/uploads
  /company_id
    /tickets
      /ticket_id
        /images
        /videos
        /audios
        /documents
```

### Amazon S3

```typescript
// Estrutura no S3
s3://chatblue-media/
  company_id/
    year/
      month/
        ticket_id/
          file.jpg
```

### Limpeza Automatica

Configure limpeza automatica de arquivos antigos:

```typescript
{
  cleanup: {
    enabled: true,
    retentionDays: 90, // Manter por 90 dias
    excludeTypes: ['document'], // Nao apagar documentos
    schedule: '0 2 * * *' // Executar as 2h
  }
}
```

## Seguranca

### Validacao de Arquivos

O ChatBlue valida arquivos antes do upload:

```typescript
// Validacoes aplicadas
{
  validation: {
    checkMimeType: true,      // Verificar tipo MIME
    checkExtension: true,     // Verificar extensao
    scanVirus: false,         // Requer ClamAV
    maxFilenameLength: 255
  }
}
```

### URLs Assinadas

Para maior seguranca, use URLs assinadas:

```typescript
// URL assinada expira em 1 hora
const signedUrl = await mediaService.getSignedUrl(mediaId, {
  expiresIn: 3600
});
```

### Controle de Acesso

```typescript
// Verificar permissao antes de servir midia
app.get('/media/:id', async (req, res) => {
  const media = await Media.findById(req.params.id);

  // Verificar se usuario tem acesso ao ticket
  const hasAccess = await checkAccess(req.user, media.ticketId);

  if (!hasAccess) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Servir arquivo
  res.sendFile(media.path);
});
```

## Boas Praticas

### 1. Otimize Imagens

- Use compressao para reduzir tamanho
- Converta para formatos otimizados (WebP)
- Redimensione para tamanhos adequados

### 2. Organize Arquivos

- Use estrutura de pastas logica
- Inclua metadados nos arquivos
- Mantenha backup dos arquivos importantes

### 3. Configure Limites

- Defina tamanhos maximos por tipo
- Bloqueie tipos de arquivo perigosos
- Monitore uso de armazenamento

### 4. Seguranca

- Valide todos os uploads
- Use URLs assinadas
- Configure CORS adequadamente

## Solucao de Problemas

### Erro: "Arquivo muito grande"

**Causa**: Arquivo excede o limite configurado

**Solucao**:
1. Comprima o arquivo antes de enviar
2. Aumente o limite em `mediaConfig.maxFileSize`
3. Use um servico de compressao externo

### Erro: "Tipo de arquivo nao permitido"

**Causa**: Extensao ou MIME type nao esta na lista de permitidos

**Solucao**:
1. Verifique a extensao do arquivo
2. Adicione o tipo na configuracao `allowedTypes`
3. Converta para um formato suportado

### Imagem nao carrega

**Causas**:
- URL expirada
- Arquivo corrompido
- Problema de permissao

**Solucao**:
1. Verifique se a URL esta acessivel
2. Tente baixar novamente
3. Verifique permissoes do armazenamento

### Audio nao reproduz

**Causa**: Formato de audio nao suportado pelo navegador

**Solucao**:
1. Converta para MP3 ou AAC
2. Verifique codecs do navegador
3. Use player alternativo

### Upload lento

**Causas**:
- Arquivo muito grande
- Conexao lenta
- Servidor sobrecarregado

**Solucao**:
1. Comprima o arquivo
2. Use upload em chunks
3. Verifique a conexao de rede

```typescript
// Upload em chunks para arquivos grandes
const chunkSize = 5 * 1024 * 1024; // 5 MB
const chunks = Math.ceil(file.size / chunkSize);

for (let i = 0; i < chunks; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);

  await uploadChunk(chunk, i, chunks);
}
```

## Proximos Passos

Apos configurar midia:

- [Configurar Transcricao de Audio](/guias/inteligencia-artificial/transcricao)
- [Configurar Templates com Midia](/guias/whatsapp/templates)
- [Configurar Armazenamento em Nuvem](/deploy/producao)
