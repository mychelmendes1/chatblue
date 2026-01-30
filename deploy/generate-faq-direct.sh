#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Gerando FAQ diretamente do banco de dados ==="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Executar query SQL e processar resultado
send "cat > /tmp/generate_faq.sql << 'EOFSQL'
-- Extrair mensagens de clientes de tickets resolvidos/fechados
SELECT 
    m.content,
    m.created_at,
    t.protocol,
    t.status,
    t.resolved_at,
    c.name as contact_name,
    c.phone
FROM messages m
INNER JOIN tickets t ON m.ticket_id = t.id
INNER JOIN contacts c ON t.contact_id = c.id
WHERE 
    t.status IN ('RESOLVED', 'CLOSED')
    AND m.is_from_me = false
    AND m.type = 'TEXT'
    AND m.content IS NOT NULL
    AND LENGTH(m.content) > 10
    AND t.resolved_at >= NOW() - INTERVAL '30 days'
ORDER BY m.created_at DESC
LIMIT 1000;
EOFSQL\r"

expect "# "

# Executar query e salvar em arquivo JSON
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -t -A -F '|' < /tmp/generate_faq.sql > /tmp/messages_data.txt 2>&1\r"
expect "# "

# Verificar quantas linhas foram extraídas
send "wc -l /tmp/messages_data.txt\r"
expect "# "

# Criar script Node.js simples para processar os dados
send "cat > /tmp/process_faq.js << 'EOFJS'
const fs = require('fs');
const path = require('path');

// Ler dados
const data = fs.readFileSync('/tmp/messages_data.txt', 'utf-8');
const lines = data.trim().split('\\n').filter(l => l.trim());

console.log('Processing', lines.length, 'messages...');

// Categorias
const categories = {
  'Acesso e Conexão': [],
  'Problemas Técnicos': [],
  'Dúvidas Comerciais': [],
  'Pedidos e Entregas': [],
  'Pagamentos e Reembolsos': [],
  'Uso do Sistema': [],
  'Outras Dúvidas': [],
};

// Processar cada linha
lines.forEach((line, idx) => {
  const parts = line.split('|');
  if (parts.length < 7) return;
  
  const content = parts[0] || '';
  const protocol = parts[2] || 'N/A';
  
  if (content.length < 10) return;
  
  // Categorizar
  let category = 'Outras Dúvidas';
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.match(/como (fazer|conectar|acessar|usar|configurar)|whatsapp|conexão|conexao|qr|qrcode|link|login|senha/i)) {
    category = 'Acesso e Conexão';
  } else if (lowerContent.match(/erro|problema|não funciona|nao funciona|trava|lento|bug|erro técnico|erro tecnico/i)) {
    category = 'Problemas Técnicos';
  } else if (lowerContent.match(/preço|preco|valor|pagamento|cobrança|cobranca|fatura|plano|assinatura|desconto/i)) {
    category = 'Dúvidas Comerciais';
  } else if (lowerContent.match(/pedido|entrega|prazo|status|rastreio|quando chega|envio|recebimento/i)) {
    category = 'Pedidos e Entregas';
  } else if (lowerContent.match(/reembolso|devolução|devolucao|troca|cancelamento|estorno|dinheiro/i)) {
    category = 'Pagamentos e Reembolsos';
  } else if (lowerContent.match(/como usar|como fazer|funcionalidade|recurso|ajuda|dúvida|duvida|explica/i)) {
    category = 'Uso do Sistema';
  }
  
  // Normalizar pergunta
  const question = content.length > 80 ? content.substring(0, 80) + '...' : content;
  
  // Verificar similaridade
  const words = question.toLowerCase().split(/\\s+/).slice(0, 10).join(' ');
  let existing = categories[category].find(faq => {
    const faqWords = faq.question.toLowerCase().split(/\\s+/).slice(0, 10).join(' ');
    const faqSet = new Set(faqWords.split(' '));
    const wordSet = new Set(words.split(' '));
    const intersection = [...faqSet].filter(x => wordSet.has(x)).length;
    const union = new Set([...faqSet, ...wordSet]).size;
    return (intersection / union) > 0.3;
  });
  
  if (existing) {
    existing.frequency++;
    if (existing.examples.length < 3) {
      existing.examples.push({ text: content.substring(0, 150), protocol });
    }
  } else {
    categories[category].push({
      question,
      frequency: 1,
      examples: [{ text: content.substring(0, 150), protocol }],
    });
  }
});

// Gerar Markdown
let md = '---\\n';
md += 'sidebar_position: 51\\n';
md += 'title: FAQ - Atendimentos Reais\\n';
md += 'description: Perguntas frequentes extraídas das conversas atendidas\\n';
md += '---\\n\\n';
md += '# FAQ - Baseado em Atendimentos Reais\\n\\n';
md += 'Esta documentação foi gerada automaticamente a partir das conversas atendidas nos últimos 30 dias.\\n\\n';
md += '**Última atualização:** ' + new Date().toLocaleDateString('pt-BR') + '\\n';
md += '**Total de mensagens analisadas:** ' + lines.length + '\\n\\n';
md += '---\\n\\n';

// Ordenar categorias
const sortedCategories = Object.entries(categories)
  .map(([category, items]) => ({
    category,
    items: items.sort((a, b) => b.frequency - a.frequency).slice(0, 15),
    total: items.reduce((sum, item) => sum + item.frequency, 0),
  }))
  .filter(cat => cat.items.length > 0)
  .sort((a, b) => b.total - a.total);

// Gerar conteúdo
sortedCategories.forEach(({ category, items, total }) => {
  md += '## ' + category + '\\n\\n';
  md += '**' + items.length + '** perguntas frequentes (' + total + ' ocorrências)\\n\\n';
  
  items.forEach((item, idx) => {
    md += '### ' + (idx + 1) + '. ' + item.question + '\\n\\n';
    md += '*Frequência: ' + item.frequency + ' ocorrências*\\n\\n';
    
    if (item.examples.length > 0) {
      md += '**Exemplos:**\\n\\n';
      item.examples.forEach(ex => {
        md += '- \"' + ex.text + '\" *(Protocolo: ' + ex.protocol + ')*\\n';
      });
      md += '\\n';
    }
    md += '---\\n\\n';
  });
});

// Salvar arquivo
const outputPath = '/opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, md, 'utf-8');

console.log('FAQ generated successfully!');
console.log('File:', outputPath);
console.log('Categories:', sortedCategories.length);
console.log('Total questions:', sortedCategories.reduce((sum, cat) => sum + cat.items.length, 0));
EOFJS\r"

expect "# "

# Executar script Node.js
send "node /tmp/process_faq.js 2>&1\r"
expect "# "

# Verificar arquivo gerado
send "test -f /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md && (echo 'SUCCESS' && wc -l /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md && head -20 /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md) || echo 'FAILED'\r"
expect "# "

send "exit\r"
expect eof

puts "\n=== FAQ gerado com sucesso! ==="



