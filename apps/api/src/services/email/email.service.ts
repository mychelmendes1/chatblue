import { logger } from "../../config/logger";
import * as Brevo from "@getbrevo/brevo";

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Alert recipients from environment variable
const getAlertRecipients = (): string[] => {
  const recipients = process.env.ALERT_RECIPIENTS || "";
  return recipients.split(",").map((r) => r.trim()).filter(Boolean);
};

// Email templates
const templates = {
  slaWarning: (data: { ticketProtocol: string; remainingMinutes: number; ticketUrl: string }): EmailTemplate => ({
    subject: `[ChatBlue] Aviso: SLA próximo do limite - Ticket #${data.ticketProtocol}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Aviso de SLA</h1>
            </div>
            <div class="content">
              <p>O ticket <strong>#${data.ticketProtocol}</strong> está próximo de violar o SLA.</p>
              <p><strong>Tempo restante:</strong> ${data.remainingMinutes} minutos</p>
              <p>Por favor, responda o cliente o mais rápido possível.</p>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.ticketUrl}" class="button">Ver Ticket</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Aviso de SLA - Ticket #${data.ticketProtocol}\n\nO ticket está próximo de violar o SLA.\nTempo restante: ${data.remainingMinutes} minutos\n\nAcesse: ${data.ticketUrl}`,
  }),

  slaBreach: (data: { ticketProtocol: string; ticketUrl: string }): EmailTemplate => ({
    subject: `[ChatBlue] URGENTE: SLA Violado - Ticket #${data.ticketProtocol}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 SLA Violado</h1>
            </div>
            <div class="content">
              <p>O ticket <strong>#${data.ticketProtocol}</strong> <strong style="color: #dc2626;">violou o SLA</strong>.</p>
              <p>Ação imediata é necessária!</p>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.ticketUrl}" class="button">Ver Ticket</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `URGENTE: SLA Violado - Ticket #${data.ticketProtocol}\n\nO ticket violou o SLA.\nAção imediata é necessária!\n\nAcesse: ${data.ticketUrl}`,
  }),

  newTicket: (data: { ticketProtocol: string; contactName: string; ticketUrl: string }): EmailTemplate => ({
    subject: `[ChatBlue] Novo Ticket #${data.ticketProtocol} - ${data.contactName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Novo Ticket</h1>
            </div>
            <div class="content">
              <p>Um novo ticket foi criado.</p>
              <p><strong>Ticket:</strong> #${data.ticketProtocol}</p>
              <p><strong>Cliente:</strong> ${data.contactName}</p>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.ticketUrl}" class="button">Ver Ticket</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Novo Ticket #${data.ticketProtocol}\n\nCliente: ${data.contactName}\n\nAcesse: ${data.ticketUrl}`,
  }),

  ticketAssigned: (data: { ticketProtocol: string; agentName: string; ticketUrl: string }): EmailTemplate => ({
    subject: `[ChatBlue] Ticket #${data.ticketProtocol} atribuído a você`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Ticket Atribuído</h1>
            </div>
            <div class="content">
              <p>Olá ${data.agentName},</p>
              <p>O ticket <strong>#${data.ticketProtocol}</strong> foi atribuído a você.</p>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.ticketUrl}" class="button">Ver Ticket</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Ticket #${data.ticketProtocol} atribuído a você\n\nOlá ${data.agentName},\n\nO ticket foi atribuído a você.\n\nAcesse: ${data.ticketUrl}`,
  }),

  connectionDown: (data: { 
    connectionName: string; 
    companyName: string; 
    connectionsUrl: string;
    disconnectReason?: string;
    disconnectedAt: string;
  }): EmailTemplate => ({
    subject: `🚨 [ChatBlue] Conexão "${data.connectionName}" DESCONECTADA`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .info-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Conexão Desconectada</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p style="margin: 0;"><strong>Conexão:</strong> ${data.connectionName}</p>
                <p style="margin: 8px 0 0 0;"><strong>Empresa:</strong> ${data.companyName}</p>
                <p style="margin: 8px 0 0 0;"><strong>Data/Hora:</strong> ${data.disconnectedAt}</p>
                ${data.disconnectReason ? `<p style="margin: 8px 0 0 0;"><strong>Motivo:</strong> ${data.disconnectReason}</p>` : ""}
              </div>
              <p>A conexão WhatsApp deixou de funcionar e precisa ser reconectada.</p>
              <p><strong>Ação necessária:</strong> Acesse o painel e escaneie o QR Code novamente.</p>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.connectionsUrl}" class="button">Reconectar Agora</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `🚨 Conexão Desconectada\n\nConexão: ${data.connectionName}\nEmpresa: ${data.companyName}\nData/Hora: ${data.disconnectedAt}\n${data.disconnectReason ? `Motivo: ${data.disconnectReason}\n` : ""}\nAcesse para reconectar: ${data.connectionsUrl}`,
  }),

  ticketsNoResponse: (data: {
    companyName: string;
    tickets: Array<{ protocol: string; contactName: string; hoursOpen: number }>;
    chatUrl: string;
  }): EmailTemplate => ({
    subject: `[ChatBlue] Alerta: ${data.tickets.length} ticket(s) sem resposta há mais de 12h`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .ticket-list { margin: 16px 0; padding: 0; list-style: none; }
            .ticket-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Tickets sem resposta</h1>
            </div>
            <div class="content">
              <p>A empresa <strong>${data.companyName}</strong> possui <strong>${data.tickets.length}</strong> ticket(s) abertos há mais de 12 horas sem resposta.</p>
              <ul class="ticket-list">
                ${data.tickets.map((t) => `<li><strong>#${t.protocol}</strong> – ${t.contactName} (${t.hoursOpen}h sem resposta)</li>`).join("")}
              </ul>
              <p style="text-align: center;">
                <a href="${data.chatUrl}" class="button">Abrir conversas</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Alerta: ${data.tickets.length} ticket(s) sem resposta há mais de 12h (${data.companyName}).\n\n${data.tickets.map((t) => `#${t.protocol} – ${t.contactName} (${t.hoursOpen}h)`).join("\n")}\n\nAcesse: ${data.chatUrl}`,
  }),

  welcomeUser: (data: { userName: string; loginUrl: string; tempPassword?: string }): EmailTemplate => ({
    subject: `[ChatBlue] Bem-vindo ao ChatBlue!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .password-box { background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao ChatBlue!</h1>
            </div>
            <div class="content">
              <p>Olá ${data.userName},</p>
              <p>Sua conta foi criada com sucesso no ChatBlue.</p>
              ${data.tempPassword ? `
                <p><strong>Sua senha temporária:</strong></p>
                <p class="password-box">${data.tempPassword}</p>
                <p><em>Por segurança, altere sua senha no primeiro acesso.</em></p>
              ` : ''}
              <p style="text-align: center; margin-top: 20px;">
                <a href="${data.loginUrl}" class="button">Acessar ChatBlue</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Bem-vindo ao ChatBlue!\n\nOlá ${data.userName},\n\nSua conta foi criada com sucesso.\n${data.tempPassword ? `Senha temporária: ${data.tempPassword}\n` : ''}\nAcesse: ${data.loginUrl}`,
  }),

  dailyReport: (data: {
    date: string;
    // Volume
    ticketsOpen: number;
    ticketsNew24h: number;
    ticketsResolved24h: number;
    ticketsBacklog: number;
    // SLA
    slaCompliance: number;
    slaAtRisk: number;
    slaBreached: number;
    // Tempo
    avgResponseTime: string;
    avgResolutionTime: string;
    ticketsNoResponse2h: number;
    // Atendentes
    agentStats: Array<{ name: string; active: number; resolved24h: number }>;
    ticketsUnassigned: number;
    // IA
    aiRate: number;
    aiTransferred: number;
    // Qualidade
    avgNps: number | null;
    avgCsat: number | null;
    // Conexões
    connections: Array<{ name: string; status: string; company: string }>;
    dashboardUrl: string;
  }): EmailTemplate => ({
    subject: `📊 [ChatBlue] Relatório Diário de Operação - ${data.date}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 8px 0 0 0; opacity: 0.9; }
            .content { padding: 24px; background: #f9fafb; }
            .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .section-title { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            .metric { text-align: center; padding: 12px; background: #f3f4f6; border-radius: 6px; }
            .metric-value { font-size: 24px; font-weight: 700; color: #1f2937; }
            .metric-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .metric-green .metric-value { color: #10b981; }
            .metric-red .metric-value { color: #ef4444; }
            .metric-yellow .metric-value { color: #f59e0b; }
            .metric-blue .metric-value { color: #3b82f6; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 12px; color: #6b7280; }
            td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .status-connected { color: #10b981; font-weight: 600; }
            .status-disconnected { color: #ef4444; font-weight: 600; }
            .status-error { color: #f59e0b; font-weight: 600; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .highlight-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
            .alert-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Relatório Diário</h1>
              <p>${data.date}</p>
            </div>
            <div class="content">
              <!-- Volume de Tickets -->
              <div class="section">
                <div class="section-title">📈 Volume de Tickets</div>
                <div class="metrics-grid">
                  <div class="metric">
                    <div class="metric-value">${data.ticketsOpen}</div>
                    <div class="metric-label">Abertos</div>
                  </div>
                  <div class="metric metric-blue">
                    <div class="metric-value">${data.ticketsNew24h}</div>
                    <div class="metric-label">Novos (24h)</div>
                  </div>
                  <div class="metric metric-green">
                    <div class="metric-value">${data.ticketsResolved24h}</div>
                    <div class="metric-label">Resolvidos (24h)</div>
                  </div>
                  <div class="metric ${data.ticketsBacklog > 10 ? 'metric-red' : ''}">
                    <div class="metric-value">${data.ticketsBacklog}</div>
                    <div class="metric-label">Backlog (+48h)</div>
                  </div>
                </div>
              </div>

              <!-- SLA -->
              <div class="section">
                <div class="section-title">⏱️ SLA</div>
                <div class="metrics-grid">
                  <div class="metric ${data.slaCompliance >= 90 ? 'metric-green' : data.slaCompliance >= 70 ? 'metric-yellow' : 'metric-red'}">
                    <div class="metric-value">${data.slaCompliance}%</div>
                    <div class="metric-label">Compliance</div>
                  </div>
                  <div class="metric ${data.slaAtRisk > 0 ? 'metric-yellow' : ''}">
                    <div class="metric-value">${data.slaAtRisk}</div>
                    <div class="metric-label">Em Risco</div>
                  </div>
                  <div class="metric ${data.slaBreached > 0 ? 'metric-red' : ''}">
                    <div class="metric-value">${data.slaBreached}</div>
                    <div class="metric-label">Estourados</div>
                  </div>
                  <div class="metric ${data.ticketsNoResponse2h > 0 ? 'metric-yellow' : ''}">
                    <div class="metric-value">${data.ticketsNoResponse2h}</div>
                    <div class="metric-label">Sem resposta (+2h)</div>
                  </div>
                </div>
              </div>

              <!-- Tempos -->
              <div class="section">
                <div class="section-title">⏰ Tempo de Atendimento</div>
                <div class="metrics-grid" style="grid-template-columns: repeat(2, 1fr);">
                  <div class="metric">
                    <div class="metric-value">${data.avgResponseTime}</div>
                    <div class="metric-label">Tempo Médio de Resposta</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${data.avgResolutionTime}</div>
                    <div class="metric-label">Tempo Médio de Resolução</div>
                  </div>
                </div>
              </div>

              <!-- IA e Qualidade -->
              <div class="section">
                <div class="section-title">🤖 IA e Qualidade</div>
                <div class="metrics-grid">
                  <div class="metric metric-blue">
                    <div class="metric-value">${data.aiRate}%</div>
                    <div class="metric-label">Taxa IA</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${data.aiTransferred}</div>
                    <div class="metric-label">Transferidos p/ Humano</div>
                  </div>
                  <div class="metric ${data.avgNps !== null && data.avgNps >= 8 ? 'metric-green' : data.avgNps !== null && data.avgNps >= 6 ? 'metric-yellow' : ''}">
                    <div class="metric-value">${data.avgNps !== null ? data.avgNps.toFixed(1) : '-'}</div>
                    <div class="metric-label">NPS Médio</div>
                  </div>
                  <div class="metric ${data.avgCsat !== null && data.avgCsat >= 4 ? 'metric-green' : data.avgCsat !== null && data.avgCsat >= 3 ? 'metric-yellow' : ''}">
                    <div class="metric-value">${data.avgCsat !== null ? data.avgCsat.toFixed(1) : '-'}</div>
                    <div class="metric-label">CSAT Médio</div>
                  </div>
                </div>
              </div>

              <!-- Atendentes -->
              <div class="section">
                <div class="section-title">👥 Atendentes</div>
                ${data.ticketsUnassigned > 0 ? `<div class="alert-box"><strong>${data.ticketsUnassigned}</strong> ticket(s) na fila sem atendente</div>` : ''}
                <table>
                  <thead>
                    <tr>
                      <th>Atendente</th>
                      <th style="text-align: center;">Ativos</th>
                      <th style="text-align: center;">Resolvidos (24h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.agentStats.map(agent => `
                      <tr>
                        <td>${agent.name}</td>
                        <td style="text-align: center;">${agent.active}</td>
                        <td style="text-align: center;">${agent.resolved24h}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Conexões -->
              <div class="section">
                <div class="section-title">📱 Status das Conexões</div>
                <table>
                  <thead>
                    <tr>
                      <th>Conexão</th>
                      <th>Empresa</th>
                      <th style="text-align: center;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.connections.map(conn => `
                      <tr>
                        <td>${conn.name}</td>
                        <td>${conn.company}</td>
                        <td style="text-align: center;" class="status-${conn.status.toLowerCase()}">${conn.status === 'CONNECTED' ? '🟢 Conectado' : conn.status === 'DISCONNECTED' ? '🔴 Desconectado' : '🟡 ' + conn.status}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <p style="text-align: center; margin-top: 24px;">
                <a href="${data.dashboardUrl}" class="button">Abrir Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático do ChatBlue. Não responda este email.</p>
              <p>Relatório gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Relatório Diário de Operação - ${data.date}

VOLUME DE TICKETS
- Abertos: ${data.ticketsOpen}
- Novos (24h): ${data.ticketsNew24h}
- Resolvidos (24h): ${data.ticketsResolved24h}
- Backlog (+48h): ${data.ticketsBacklog}

SLA
- Compliance: ${data.slaCompliance}%
- Em Risco: ${data.slaAtRisk}
- Estourados: ${data.slaBreached}
- Sem resposta (+2h): ${data.ticketsNoResponse2h}

TEMPOS
- Tempo Médio de Resposta: ${data.avgResponseTime}
- Tempo Médio de Resolução: ${data.avgResolutionTime}

IA E QUALIDADE
- Taxa IA: ${data.aiRate}%
- Transferidos p/ Humano: ${data.aiTransferred}
- NPS Médio: ${data.avgNps !== null ? data.avgNps.toFixed(1) : '-'}
- CSAT Médio: ${data.avgCsat !== null ? data.avgCsat.toFixed(1) : '-'}

ATENDENTES
- Na fila sem atendente: ${data.ticketsUnassigned}
${data.agentStats.map(a => `- ${a.name}: ${a.active} ativos, ${a.resolved24h} resolvidos`).join('\n')}

CONEXÕES
${data.connections.map(c => `- ${c.name} (${c.company}): ${c.status}`).join('\n')}

Dashboard: ${data.dashboardUrl}`,
  }),
};

export class EmailService {
  private brevoApiKey: string;
  private defaultFrom: string;
  private defaultFromName: string;
  private brevoClient: Brevo.TransactionalEmailsApi | null = null;

  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY || "";
    this.defaultFrom = process.env.EMAIL_FROM || "noreply@grupoblue.com.br";
    this.defaultFromName = process.env.EMAIL_FROM_NAME || "ChatBlue";

    if (this.brevoApiKey) {
      this.initBrevo();
    }
  }

  private initBrevo() {
    try {
      const apiInstance = new Brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, this.brevoApiKey);
      this.brevoClient = apiInstance;
      logger.info("Brevo email service initialized");
    } catch (error) {
      logger.error("Failed to initialize Brevo:", error);
    }
  }

  private isConfigured(): boolean {
    return !!this.brevoApiKey && !!this.brevoClient;
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn("Email service not configured (BREVO_API_KEY missing). Skipping email send.");
      return false;
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.sender = {
        email: options.from || this.defaultFrom,
        name: this.defaultFromName,
      };
      sendSmtpEmail.to = recipients.map(email => ({ email }));
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;
      sendSmtpEmail.textContent = options.text;

      if (options.replyTo) {
        sendSmtpEmail.replyTo = { email: options.replyTo };
      }

      const result = await this.brevoClient!.sendTransacEmail(sendSmtpEmail);
      logger.info(`Email sent via Brevo: ${options.subject} to ${recipients.join(", ")}`, { messageId: result.body?.messageId });

      return true;
    } catch (error: any) {
      logger.error("Failed to send email via Brevo:", { 
        error: error.message || error,
        subject: options.subject,
        to: options.to 
      });
      return false;
    }
  }

  // Get alert recipients from env
  getAlertRecipients(): string[] {
    return getAlertRecipients();
  }

  // Template-based email methods
  async sendSLAWarning(
    to: string,
    data: { ticketProtocol: string; remainingMinutes: number; ticketUrl: string }
  ): Promise<boolean> {
    const template = templates.slaWarning(data);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendSLABreach(
    to: string,
    data: { ticketProtocol: string; ticketUrl: string }
  ): Promise<boolean> {
    const template = templates.slaBreach(data);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendNewTicket(
    to: string,
    data: { ticketProtocol: string; contactName: string; ticketUrl: string }
  ): Promise<boolean> {
    const template = templates.newTicket(data);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendTicketAssigned(
    to: string,
    data: { ticketProtocol: string; agentName: string; ticketUrl: string }
  ): Promise<boolean> {
    const template = templates.ticketAssigned(data);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendWelcome(
    to: string,
    data: { userName: string; loginUrl: string; tempPassword?: string }
  ): Promise<boolean> {
    const template = templates.welcomeUser(data);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendConnectionDown(
    to: string | string[],
    data: { 
      connectionName: string; 
      companyName: string; 
      connectionsUrl: string;
      disconnectReason?: string;
      disconnectedAt: string;
    }
  ): Promise<boolean> {
    const template = templates.connectionDown(data);
    return this.send({
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendTicketsNoResponse(
    to: string | string[],
    data: {
      companyName: string;
      tickets: Array<{ protocol: string; contactName: string; hoursOpen: number }>;
      chatUrl: string;
    }
  ): Promise<boolean> {
    const template = templates.ticketsNoResponse(data);
    return this.send({
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendDailyReport(
    to: string | string[],
    data: {
      date: string;
      ticketsOpen: number;
      ticketsNew24h: number;
      ticketsResolved24h: number;
      ticketsBacklog: number;
      slaCompliance: number;
      slaAtRisk: number;
      slaBreached: number;
      avgResponseTime: string;
      avgResolutionTime: string;
      ticketsNoResponse2h: number;
      agentStats: Array<{ name: string; active: number; resolved24h: number }>;
      ticketsUnassigned: number;
      aiRate: number;
      aiTransferred: number;
      avgNps: number | null;
      avgCsat: number | null;
      connections: Array<{ name: string; status: string; company: string }>;
      dashboardUrl: string;
    }
  ): Promise<boolean> {
    const template = templates.dailyReport(data);
    return this.send({
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Send alert to all configured recipients
  async sendAlertToRecipients(
    templateFn: (to: string | string[]) => Promise<boolean>
  ): Promise<boolean> {
    const recipients = this.getAlertRecipients();
    if (recipients.length === 0) {
      logger.warn("No alert recipients configured in ALERT_RECIPIENTS");
      return false;
    }
    return templateFn(recipients);
  }
}

// Export singleton instance
export const emailService = new EmailService();
