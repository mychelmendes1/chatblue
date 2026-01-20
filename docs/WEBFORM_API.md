# API de Formulário Web

Esta API permite que formulários web externos enviem mensagens e criem conversas automaticamente no sistema.

## Endpoint

```
POST /api/webform/submit
```

## Autenticação

A API utiliza autenticação via **API Key**. A chave deve ser enviada em um dos seguintes formatos:

1. **Header** (recomendado):
   ```
   X-API-Key: sua-api-key-aqui
   ```

2. **Query Parameter**:
   ```
   ?apiKey=sua-api-key-aqui
   ```

3. **Body** (não recomendado para produção):
   ```json
   {
     "apiKey": "sua-api-key-aqui",
     ...
   }
   ```

## Configuração da API Key

A API Key é configurada no campo `webformApiKey` da tabela `companies`. Cada empresa pode ter uma API Key única.

### Gerar API Key

Você pode gerar uma API Key usando qualquer gerador de UUID ou string aleatória. Exemplo:

```javascript
// Node.js
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log(apiKey);
```

### Atualizar API Key no Banco

```sql
UPDATE companies 
SET webform_api_key = 'sua-api-key-gerada' 
WHERE id = 'id-da-empresa';
```

## Request Body

```json
{
  "name": "João Silva",
  "phone": "5511999999999",
  "email": "joao@example.com",
  "message": "Olá, gostaria de mais informações sobre seus produtos."
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome do contato |
| `phone` | string | Sim | Telefone do contato (com ou sem formatação) |
| `email` | string | Não | Email do contato |
| `message` | string | Sim | Mensagem de boas-vindas a ser enviada |

## Response

### Sucesso (201 Created)

```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "ticketId": "clx1234567890",
  "protocol": "TKT-2024-001234",
  "contactId": "clx0987654321"
}
```

### Erro de Autenticação (401 Unauthorized)

```json
{
  "error": "API Key inválida"
}
```

### Erro de Validação (400 Bad Request)

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "path": ["name"],
      "message": "Nome é obrigatório"
    }
  ]
}
```

### Erro de Conexão (400 Bad Request)

```json
{
  "error": "Nenhuma conexão WhatsApp ativa encontrada para esta empresa"
}
```

## Exemplo de Uso

### JavaScript (Fetch)

```javascript
fetch('https://api.exemplo.com/api/webform/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua-api-key-aqui'
  },
  body: JSON.stringify({
    name: 'João Silva',
    phone: '5511999999999',
    email: 'joao@example.com',
    message: 'Olá, gostaria de mais informações sobre seus produtos.'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Sucesso:', data);
})
.catch(error => {
  console.error('Erro:', error);
});
```

### jQuery

```javascript
$.ajax({
  url: 'https://api.exemplo.com/api/webform/submit',
  method: 'POST',
  headers: {
    'X-API-Key': 'sua-api-key-aqui'
  },
  contentType: 'application/json',
  data: JSON.stringify({
    name: 'João Silva',
    phone: '5511999999999',
    email: 'joao@example.com',
    message: 'Olá, gostaria de mais informações sobre seus produtos.'
  }),
  success: function(data) {
    console.log('Sucesso:', data);
  },
  error: function(xhr, status, error) {
    console.error('Erro:', error);
  }
});
```

### HTML Form (com JavaScript)

```html
<form id="contactForm">
  <input type="text" name="name" placeholder="Nome" required>
  <input type="tel" name="phone" placeholder="Telefone" required>
  <input type="email" name="email" placeholder="Email">
  <textarea name="message" placeholder="Mensagem" required></textarea>
  <button type="submit">Enviar</button>
</form>

<script>
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    message: formData.get('message')
  };
  
  try {
    const response = await fetch('https://api.exemplo.com/api/webform/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sua-api-key-aqui'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Mensagem enviada com sucesso!');
      e.target.reset();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (error) {
    alert('Erro ao enviar: ' + error.message);
  }
});
</script>
```

## Comportamento

1. **Criação/Atualização de Contato**: A API verifica se já existe um contato com o telefone informado. Se existir, atualiza as informações se necessário. Se não existir, cria um novo contato.

2. **Criação de Ticket**: A API verifica se já existe um ticket aberto para o contato. Se existir, usa o ticket existente. Se não existir, cria um novo ticket no departamento "Triagem".

3. **Envio de Mensagem**: A mensagem é enviada via WhatsApp para o contato. Se o envio falhar, o ticket ainda é criado, mas a resposta incluirá um aviso.

4. **Notificações**: Quando um ticket é criado, um evento Socket.IO é emitido para notificar os agentes em tempo real.

## Segurança

- A API Key deve ser mantida em segredo
- Use HTTPS em produção
- Considere implementar rate limiting no seu servidor web
- Valide e sanitize os dados no frontend antes de enviar

## Troubleshooting

### Erro: "API Key é obrigatória"
- Verifique se a API Key está sendo enviada no header `X-API-Key` ou como query parameter `apiKey`

### Erro: "API Key inválida"
- Verifique se a API Key está correta no banco de dados
- Verifique se a empresa está ativa (`isActive = true`)

### Erro: "Nenhuma conexão WhatsApp ativa"
- Verifique se existe uma conexão WhatsApp configurada e ativa para a empresa
- Verifique se a conexão está com status `CONNECTED` ou pelo menos `isActive = true`

### Mensagem não enviada
- Verifique os logs da API para mais detalhes
- Verifique se a conexão WhatsApp está realmente conectada
- O ticket será criado mesmo se a mensagem não for enviada, mas a resposta incluirá um aviso






