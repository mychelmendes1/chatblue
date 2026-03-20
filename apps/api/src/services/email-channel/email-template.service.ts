interface TemplateMessage {
  isFromMe: boolean;
  senderName: string;
  content: string;
  createdAt: Date | string;
}

interface TemplateData {
  companyName: string;
  companyLogo?: string | null;
  protocol: string;
  subject?: string | null;
  agentMessage: string;
  history: TemplateMessage[];
  primaryColor?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildEmailHtml(data: TemplateData): string {
  const color = data.primaryColor || '#2563eb';

  const historyRows = data.history
    .slice(-15) // last 15 messages
    .map((msg) => {
      const label = msg.isFromMe ? msg.senderName : 'Cliente';
      const bg = msg.isFromMe ? '#f0f4ff' : '#f9fafb';
      return `
      <tr>
        <td style="padding:8px 12px;background:${bg};border-bottom:1px solid #e5e7eb;">
          <strong style="color:${msg.isFromMe ? color : '#374151'};font-size:13px;">${escapeHtml(label)}</strong>
          <span style="color:#9ca3af;font-size:11px;margin-left:8px;">${formatDate(msg.createdAt)}</span>
          <div style="color:#374151;font-size:13px;margin-top:4px;">${escapeHtml(msg.content || '')}</div>
        </td>
      </tr>`;
    })
    .join('');

  const logoBlock = data.companyLogo
    ? `<img src="${data.companyLogo}" alt="${escapeHtml(data.companyName)}" style="max-height:40px;max-width:160px;"/>`
    : `<span style="font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(data.companyName)}</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

  <!-- Header -->
  <tr>
    <td style="background:${color};padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>${logoBlock}</td>
          <td align="right" style="color:#ffffffcc;font-size:12px;">Ticket #${escapeHtml(data.protocol)}</td>
        </tr>
      </table>
    </td>
  </tr>

  ${data.subject ? `
  <tr>
    <td style="padding:16px 24px 0;font-size:16px;font-weight:600;color:#111827;">
      ${escapeHtml(data.subject)}
    </td>
  </tr>` : ''}

  <!-- Main message -->
  <tr>
    <td style="padding:24px;font-size:14px;color:#374151;line-height:1.6;">
      ${escapeHtml(data.agentMessage)}
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>

  <!-- History -->
  ${historyRows ? `
  <tr>
    <td style="padding:16px 24px 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
      Histórico da conversa
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        ${historyRows}
      </table>
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;padding:16px 24px;border-top:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#9ca3af;font-size:11px;">
            Ticket #${escapeHtml(data.protocol)}<br/>
            Enviado por ${escapeHtml(data.companyName)} via ChatBlue
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildPlainText(data: TemplateData): string {
  let text = data.agentMessage + '\n\n';
  text += '---\n';
  text += `Ticket #${data.protocol}\n`;
  if (data.history.length > 0) {
    text += '\nHistórico:\n';
    for (const msg of data.history.slice(-10)) {
      const label = msg.isFromMe ? msg.senderName : 'Cliente';
      text += `[${label} ${formatDate(msg.createdAt)}]\n${msg.content}\n\n`;
    }
  }
  text += `---\nEnviado por ${data.companyName} via ChatBlue\n`;
  return text;
}
