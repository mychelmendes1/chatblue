import { logger } from "../../config/logger";

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
};

export class EmailService {
  private smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  private defaultFrom: string;

  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    };

    this.defaultFrom = process.env.EMAIL_FROM || "ChatBlue <noreply@chatblue.com>";
  }

  private isConfigured(): boolean {
    return !!(this.smtpConfig.auth.user && this.smtpConfig.auth.pass);
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn("Email service not configured. Skipping email send.");
      return false;
    }

    try {
      // In production, use nodemailer or similar library
      // For now, we'll use a mock implementation
      const nodemailer = await this.getNodemailer();

      const transporter = nodemailer.createTransport(this.smtpConfig);

      const mailOptions = {
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);

      return true;
    } catch (error) {
      logger.error("Failed to send email:", error);
      return false;
    }
  }

  private async getNodemailer() {
    // Dynamic import for nodemailer
    try {
      return await import("nodemailer");
    } catch {
      // Fallback mock for testing
      return {
        createTransport: () => ({
          sendMail: async (options: any) => {
            logger.info(`[Mock] Email would be sent to: ${options.to}`);
            return { messageId: `mock-${Date.now()}` };
          },
        }),
      };
    }
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
}

// Export singleton instance
export const emailService = new EmailService();
