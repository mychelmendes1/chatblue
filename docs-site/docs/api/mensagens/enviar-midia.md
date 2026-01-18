---
sidebar_position: 3
title: Enviar Midia
description: Endpoint para enviar arquivos de midia em um ticket no ChatBlue
---

# Enviar Midia

Envia um arquivo de midia (imagem, audio, video ou documento) em um ticket.

## Endpoint

```
POST /api/messages/ticket/:ticketId/send-media
```

## Descricao

Este endpoint envia arquivos de midia para o contato de um ticket. Suporta imagens, audios, videos e documentos. O arquivo pode ser enviado diretamente ou por URL.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Usuario deve ter acesso ao ticket (estar atribuido ou ser supervisor/admin).

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `multipart/form-data` ou `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ticketId` | string | ID do ticket (CUID) |

### Body Parameters (multipart/form-data)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `file` | file | Sim* | Arquivo a enviar |
| `caption` | string | Nao | Legenda do arquivo |
| `quotedMessageId` | string | Nao | ID da mensagem a citar |

### Body Parameters (application/json - por URL)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `mediaUrl` | string | Sim* | URL publica do arquivo |
| `mediaType` | string | Sim | Tipo: image, audio, video, document |
| `filename` | string | Nao | Nome do arquivo (para documentos) |
| `caption` | string | Nao | Legenda do arquivo |
| `quotedMessageId` | string | Nao | ID da mensagem a citar |

*Obrigatorio: `file` (upload) OU `mediaUrl` (por URL)

### Tipos e Limites

| Tipo | Extensoes | Tamanho Maximo |
|------|-----------|----------------|
| image | jpg, jpeg, png, gif, webp | 16 MB |
| audio | mp3, ogg, wav, m4a, opus | 16 MB |
| video | mp4, 3gp, mkv | 64 MB |
| document | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip | 100 MB |

### Exemplo de Request (Upload)

```bash
# Form-data com arquivo
POST /api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send-media
Content-Type: multipart/form-data

file: [arquivo binario]
caption: "Aqui esta o documento solicitado"
```

### Exemplo de Request (URL)

```json
{
  "mediaUrl": "https://exemplo.com/imagem.jpg",
  "mediaType": "image",
  "caption": "Foto do produto"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
  "whatsappMessageId": "ABCD1234567890",
  "type": "image",
  "content": "Foto do produto",
  "mediaUrl": "https://cdn.chatblue.io/media/abc123.jpg",
  "mediaMimeType": "image/jpeg",
  "mediaSize": 125000,
  "mediaWidth": 800,
  "mediaHeight": 600,
  "fromMe": true,
  "status": "sent",
  "createdAt": "2024-01-15T14:30:00.000Z",
  "sender": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Maria Atendente",
    "avatar": "https://exemplo.com/avatar.jpg"
  },
  "ticket": {
    "id": "clticketxxxxxxxxxxxxxxxxxx",
    "number": 1234
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID da mensagem |
| `type` | string | Tipo da midia |
| `content` | string | Legenda |
| `mediaUrl` | string | URL do arquivo no CDN |
| `mediaMimeType` | string | Tipo MIME |
| `mediaSize` | number | Tamanho em bytes |
| `mediaWidth` | number | Largura (imagens/videos) |
| `mediaHeight` | number | Altura (imagens/videos) |
| `mediaDuration` | number | Duracao (audio/video) |
| `mediaFilename` | string | Nome do arquivo |
| `status` | string | Status de envio |

## Erros

### 400 Bad Request - Arquivo Nao Fornecido

```json
{
  "error": "File or media URL is required",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Tipo Nao Suportado

```json
{
  "error": "File type not supported: application/exe",
  "code": "UNSUPPORTED_FILE_TYPE",
  "supportedTypes": ["image/jpeg", "image/png", "image/gif", "image/webp", "audio/mpeg", "audio/ogg", "video/mp4", "application/pdf"]
}
```

### 400 Bad Request - Arquivo Muito Grande

```json
{
  "error": "File size exceeds maximum allowed: 16MB for images",
  "code": "FILE_TOO_LARGE",
  "maxSize": 16777216
}
```

### 400 Bad Request - Conexao Offline

```json
{
  "error": "WhatsApp connection is not connected",
  "code": "CONNECTION_OFFLINE"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

## Exemplos de Codigo

### cURL (Upload de Arquivo)

```bash
# Enviar imagem
curl -X POST https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send-media \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/caminho/para/imagem.jpg" \
  -F "caption=Foto do produto"

# Enviar documento
curl -X POST https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send-media \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/caminho/para/relatorio.pdf" \
  -F "caption=Relatorio mensal"
```

### cURL (Por URL)

```bash
curl -X POST https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send-media \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://exemplo.com/imagem.jpg",
    "mediaType": "image",
    "caption": "Foto do produto"
  }'
```

### JavaScript (Upload de Arquivo)

```javascript
async function sendMedia(ticketId, file, caption = '') {
  const accessToken = localStorage.getItem('accessToken');

  const formData = new FormData();
  formData.append('file', file);
  if (caption) formData.append('caption', caption);

  const response = await fetch(
    `https://api.chatblue.io/api/messages/ticket/${ticketId}/send-media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso com input file
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const message = await sendMedia('clticketxxxxxxxxxxxxxxxxxx', file, 'Documento anexo');
    console.log('Arquivo enviado:', message.mediaUrl);
  } catch (error) {
    console.error('Erro:', error.message);
  }
});
```

### JavaScript (Por URL)

```javascript
async function sendMediaByUrl(ticketId, mediaUrl, mediaType, caption = '') {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    `https://api.chatblue.io/api/messages/ticket/${ticketId}/send-media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaUrl,
        mediaType,
        caption,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
await sendMediaByUrl(
  'clticketxxxxxxxxxxxxxxxxxx',
  'https://exemplo.com/produto.jpg',
  'image',
  'Foto do produto'
);
```

### JavaScript - Componente de Upload

```typescript
import { useState, useRef, ChangeEvent } from 'react';

interface MediaUploadProps {
  ticketId: string;
  onUploadComplete: (message: any) => void;
}

const ACCEPTED_TYPES = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  audio: 'audio/mpeg,audio/ogg,audio/wav,audio/m4a',
  video: 'video/mp4,video/3gpp,video/quicktime',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
};

function MediaUpload({ ticketId, onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (caption) formData.append('caption', caption);

    try {
      // Upload com progresso usando XMLHttpRequest
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<any>((resolve, reject) => {
        xhr.open('POST', `/api/messages/ticket/${ticketId}/send-media`);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);

        xhr.onload = () => {
          if (xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      onUploadComplete(response);
      setSelectedFile(null);
      setCaption('');
      setPreview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="media-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={`${ACCEPTED_TYPES.image},${ACCEPTED_TYPES.audio},${ACCEPTED_TYPES.video},${ACCEPTED_TYPES.document}`}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <button onClick={() => fileInputRef.current?.click()} className="select-btn">
          Anexar arquivo
        </button>
      ) : (
        <div className="file-preview">
          {preview && <img src={preview} alt="Preview" className="preview-img" />}

          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">{formatFileSize(selectedFile.size)}</span>
          </div>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Adicionar legenda..."
            disabled={uploading}
          />

          {uploading ? (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          ) : (
            <div className="actions">
              <button onClick={() => setSelectedFile(null)}>Cancelar</button>
              <button onClick={handleUpload} className="send-btn">Enviar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Python (Upload)

```python
import requests

def send_media_file(access_token, ticket_id, file_path, caption=None):
    url = f'https://api.chatblue.io/api/messages/ticket/{ticket_id}/send-media'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {}
        if caption:
            data['caption'] = caption

        response = requests.post(url, headers=headers, files=files, data=data)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
message = send_media_file(token, 'clticketxxx', '/caminho/imagem.jpg', caption='Foto')
print(f"Arquivo enviado: {message['mediaUrl']}")
```

### Python (Por URL)

```python
def send_media_by_url(access_token, ticket_id, media_url, media_type, caption=None):
    url = f'https://api.chatblue.io/api/messages/ticket/{ticket_id}/send-media'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {
        'mediaUrl': media_url,
        'mediaType': media_type
    }
    if caption:
        payload['caption'] = caption

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
message = send_media_by_url(
    token,
    'clticketxxx',
    'https://exemplo.com/foto.jpg',
    'image',
    caption='Foto do produto'
)
```

## Notas Importantes

1. **Limite de Tamanho**: Respeite os limites de tamanho por tipo de arquivo.

2. **Tipos Permitidos**: Apenas extensoes suportadas sao aceitas.

3. **Upload vs URL**: Upload e mais seguro. URLs devem ser HTTPS e publicamente acessiveis.

4. **Processamento**: Videos e imagens podem ser redimensionados pelo WhatsApp.

5. **Armazenamento**: Arquivos sao armazenados no CDN do ChatBlue.

6. **Rate Limit**: Limite de 30 uploads por minuto por conexao.

## Endpoints Relacionados

- [Enviar Texto](/docs/api/mensagens/enviar-texto) - Enviar texto
- [Upload](/docs/api/upload/arquivo) - Upload de arquivos
- [Listar Mensagens](/docs/api/mensagens/listar) - Ver mensagens
