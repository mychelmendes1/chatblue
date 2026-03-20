import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../../config/database.js';
import { decrypt } from './crypto.util.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { buildEmailHtml, buildPlainText } from './email-template.service.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

interface SendEmailOpts {
  emailConnectionId: string;
  ticketId: string;
  content: string;
  senderId: string;
  senderName: string;
}

function buildReplyToAddress(baseEmail: string, ticketId: string): string {
  const atIdx = baseEmail.indexOf('@');
  if (atIdx === -1) return baseEmail;
  const local = baseEmail.substring(0, atIdx);
  const domain = baseEmail.substring(atIdx + 1);
  return `${local}+${ticketId}@${domain}`;
}

async function createTransporter(conn: {
  id: string;
  authType: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpTls: boolean;
  email: string;
}): Promise<Transporter> {
  if (conn.authType === 'OAUTH2') {
    const accessToken = await GoogleOAuthService.getAccessToken(conn.id);
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    return nodemailer.createTransport({
      host: conn.smtpHost,
      port: conn.smtpPort,
      secure: conn.smtpPort === 465,
      auth: {
        type: 'OAuth2',
        user: conn.email,
        clientId,
        clientSecret,
        accessToken,
      },
    } as any);
  }
  return nodemailer.createTransport({
    host: conn.smtpHost,
    port: conn.smtpPort,
    secure: conn.smtpPort === 465,
    auth: { user: conn.smtpUser, pass: decrypt(conn.smtpPassword) },
    tls: conn.smtpTls ? { rejectUnauthorized: false } : undefined,
  });
}

export class SmtpService {
  static async sendReply(opts: SendEmailOpts) {
    const { emailConnectionId, ticketId, content, senderId, senderName } = opts;

    const emailConn = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: emailConnectionId },
    });

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        contact: true,
        company: { include: { settings: true } },
        messages: {
          where: { type: { not: 'SYSTEM' } },
          orderBy: { createdAt: 'asc' },
          take: 20,
          include: { sender: { select: { name: true } } },
        },
      },
    });

    if (!ticket.contact.email) {
      throw new Error('Contact has no email address');
    }

    const companyName = ticket.company.name;
    const companyLogo = ticket.company.logo || null;

    const history = ticket.messages.map((m) => ({
      isFromMe: m.isFromMe,
      senderName: m.sender?.name || senderName,
      content: m.content || '',
      createdAt: m.createdAt,
    }));

    const html = buildEmailHtml({
      companyName,
      companyLogo,
      protocol: ticket.protocol,
      subject: ticket.subject,
      agentMessage: content,
      history,
    });

    const text = buildPlainText({
      companyName,
      companyLogo,
      protocol: ticket.protocol,
      subject: ticket.subject,
      agentMessage: content,
      history,
    });

    const replyTo = buildReplyToAddress(emailConn.email, ticketId);
    const subject = ticket.subject
      ? `Re: [#${ticket.protocol}] ${ticket.subject}`
      : `Re: [#${ticket.protocol}] Atendimento`;

    // Find the last client email message-id for In-Reply-To
    const lastClientMsg = ticket.messages
      .filter((m) => !m.isFromMe && m.metadata)
      .reverse()
      .find((m) => {
        const meta = m.metadata as Record<string, unknown> | null;
        return meta?.emailMessageId;
      });
    const inReplyTo = lastClientMsg
      ? ((lastClientMsg.metadata as Record<string, unknown>)?.emailMessageId as string)
      : undefined;

    const messageId = `<${crypto.randomUUID()}@${emailConn.email.split('@')[1] || 'chatblue.app'}>`;

    const transporter = await createTransporter(emailConn);

    await transporter.sendMail({
      from: `"${emailConn.fromName || companyName}" <${emailConn.email}>`,
      to: ticket.contact.email,
      replyTo,
      subject,
      text,
      html,
      messageId,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });

    const message = await prisma.message.create({
      data: {
        type: 'TEXT',
        content,
        htmlContent: html,
        isFromMe: true,
        status: 'SENT',
        sentAt: new Date(),
        ticketId,
        senderId,
        emailConnectionId,
        metadata: { emailMessageId: messageId, emailSubject: subject },
      },
    });

    logger.info(`Email sent for ticket ${ticket.protocol}`, { ticketId, to: ticket.contact.email });

    return message;
  }

  static async testConnection(emailConnectionId: string): Promise<{ imap: boolean; smtp: boolean; errors: string[] }> {
    const conn = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: emailConnectionId },
    });

    const errors: string[] = [];
    let smtpOk = false;

    try {
      const transporter = await createTransporter(conn);
      await transporter.verify();
      smtpOk = true;
    } catch (err: any) {
      errors.push(`SMTP: ${err.message}`);
    }

    // IMAP test delegated to imap.service
    return { imap: false, smtp: smtpOk, errors };
  }
}
