---
sidebar_position: 1
title: Upload de Arquivo
description: Endpoint para upload de arquivos no ChatBlue
---

# Upload de Arquivo

Faz upload de arquivo para o servidor.

## Endpoint

```
POST /api/upload
```

## Descricao

Este endpoint permite fazer upload de arquivos como imagens, documentos, audios e videos. Os arquivos sao armazenados de forma segura e podem ser usados em mensagens, artigos de conhecimento e outras funcionalidades.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem fazer upload de arquivos.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `multipart/form-data` | Sim |

### Form Data Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `file` | File | Sim | Arquivo a ser enviado |
| `folder` | string | Nao | Pasta destino (messages, knowledge, profile) |

### Tipos de Arquivo Suportados

| Categoria | Extensoes | Tamanho Maximo |
|-----------|-----------|----------------|
| Imagem | jpg, jpeg, png, gif, webp | 10 MB |
| Documento | pdf, doc, docx, xls, xlsx, ppt, pptx, txt | 25 MB |
| Audio | mp3, wav, ogg, m4a | 16 MB |
| Video | mp4, webm, mov | 64 MB |
| Compactado | zip, rar | 50 MB |

## Response

### Sucesso (200 OK)

```json
{
  "id": "clfilexxxxxxxxxxxxxxxxxxxxxx",
  "url": "https://storage.chatblue.io/uploads/company123/messages/abc123-documento.pdf",
  "filename": "documento.pdf",
  "originalName": "Relatorio_Janeiro.pdf",
  "mimetype": "application/pdf",
  "size": 1548576,
  "folder": "messages",
  "createdAt": "2024-01-15T14:30:00.000Z",
  "expiresAt": null
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | Identificador unico do arquivo |
| `url` | string | URL publica do arquivo |
| `filename` | string | Nome do arquivo no servidor |
| `originalName` | string | Nome original do arquivo |
| `mimetype` | string | Tipo MIME |
| `size` | number | Tamanho em bytes |
| `folder` | string | Pasta de destino |
| `expiresAt` | string/null | Data de expiracao (se temporario) |

## Erros

### 400 Bad Request

```json
{
  "error": "No file provided",
  "code": "NO_FILE"
}
```

### 413 Payload Too Large

```json
{
  "error": "File size exceeds limit",
  "code": "FILE_TOO_LARGE",
  "details": {
    "maxSize": 10485760,
    "receivedSize": 15728640
  }
}
```

### 415 Unsupported Media Type

```json
{
  "error": "File type not allowed",
  "code": "INVALID_FILE_TYPE",
  "details": {
    "received": "application/x-executable",
    "allowed": ["image/*", "application/pdf", "video/*", "audio/*"]
  }
}
```

### 507 Insufficient Storage

```json
{
  "error": "Storage quota exceeded",
  "code": "STORAGE_QUOTA_EXCEEDED",
  "details": {
    "used": 5368709120,
    "limit": 5368709120
  }
}
```

## Exemplos de Codigo

### cURL

```bash
# Upload simples
curl -X POST https://api.chatblue.io/api/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/caminho/para/documento.pdf"

# Upload com pasta especifica
curl -X POST https://api.chatblue.io/api/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/caminho/para/foto.jpg" \
  -F "folder=profile"
```

### JavaScript (Fetch)

```javascript
async function uploadFile(file, folder = 'messages') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso com input file
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const result = await uploadFile(file);
    console.log('Upload concluido:', result.url);
  } catch (error) {
    console.error('Erro no upload:', error.message);
  }
});
```

### JavaScript (Com Progresso)

```javascript
async function uploadFileWithProgress(file, folder = 'messages', onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).error));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
    xhr.send(formData);
  });
}

// Uso
const result = await uploadFileWithProgress(file, 'messages', (percent) => {
  console.log(`Progresso: ${percent}%`);
  progressBar.style.width = `${percent}%`;
});
```

### Python

```python
import requests

def upload_file(access_token, file_path, folder='messages'):
    url = 'https://api.chatblue.io/api/upload'
    headers = {'Authorization': f'Bearer {access_token}'}

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'folder': folder}

        response = requests.post(url, files=files, data=data, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
result = upload_file(token, '/caminho/para/documento.pdf')
print(f"URL: {result['url']}")
```

### React Component

```jsx
import { useState, useRef } from 'react';

function FileUploader({ onUpload, folder = 'messages' }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadFileWithProgress(file, folder, setProgress);
      onUpload(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      inputRef.current.value = '';
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {uploading && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Upload de Imagem com Redimensionamento

```javascript
async function uploadImage(file, maxWidth = 1920, maxHeight = 1080) {
  // Redimensionar antes do upload
  const resizedBlob = await resizeImage(file, maxWidth, maxHeight);

  // Criar novo File com o blob redimensionado
  const resizedFile = new File([resizedBlob], file.name, {
    type: file.type,
  });

  return uploadFile(resizedFile, 'messages');
}

function resizeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, file.type, 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

## Validacao de Arquivo no Cliente

```javascript
const FILE_LIMITS = {
  'image/*': 10 * 1024 * 1024,      // 10 MB
  'application/pdf': 25 * 1024 * 1024,  // 25 MB
  'audio/*': 16 * 1024 * 1024,      // 16 MB
  'video/*': 64 * 1024 * 1024,      // 64 MB
};

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm',
];

function validateFile(file) {
  // Verificar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Tipo de arquivo nao permitido: ${file.type}`);
  }

  // Verificar tamanho
  const category = file.type.split('/')[0] + '/*';
  const maxSize = FILE_LIMITS[category] || FILE_LIMITS[file.type] || 10 * 1024 * 1024;

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    throw new Error(`Arquivo muito grande. Maximo: ${maxMB}MB`);
  }

  return true;
}
```

## Notas Importantes

1. **Seguranca**: Arquivos sao escaneados para virus antes de serem aceitos.
2. **CDN**: Arquivos sao servidos via CDN para melhor performance.
3. **Quota**: Cada empresa tem um limite de armazenamento conforme o plano.
4. **Expiracao**: Arquivos temporarios expiram apos 24 horas.
5. **Nomes**: Arquivos sao renomeados para evitar conflitos.

## Limites por Plano

| Plano | Armazenamento Total | Tamanho Max por Arquivo |
|-------|---------------------|-------------------------|
| Starter | 1 GB | 10 MB |
| Professional | 10 GB | 50 MB |
| Enterprise | 100 GB | 100 MB |

## Endpoints Relacionados

- [Enviar Midia](/docs/api/mensagens/enviar-midia) - Enviar arquivo como mensagem
- [Criar Artigo](/docs/api/conhecimento/criar) - Anexar arquivos a artigos
