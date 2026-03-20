import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail, type Attachment } from 'mailparser';
import { prisma } from '../../config/database.js';
import { decrypt } from './crypto.util.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { logger } from '../../config/logger.js';
import { generateProtocol } from '../../utils/protocol.js';
import sanitizeHtml from 'sanitize-html';

interface ParsedEmail {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: { address: string; name: string };
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments: Attachment[];
  date: Date;
}

async function parseRawEmail(raw: Buffer): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(raw);
  const fromAddr = parsed.from?.value?.[0];
  return {
    messageId: parsed.messageId || '',
    inReplyTo: parsed.inReplyTo as string | undefined,
    references: Array.isArray(parsed.references)
      ? parsed.references
      : parsed.references
        ? [parsed.references]
        : [],
    from: {
      address: fromAddr?.address || '',
      name: fromAddr?.name || fromAddr?.address || '',
    },
    to: (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [])
      .flatMap((t) => t.value.map((v) => v.address || '')),
    subject: parsed.subject || '',
    text: parsed.text || '',
    html: typeof parsed.html === 'string' ? parsed.html : '',
    attachments: parsed.attachments || [],
    date: parsed.date || new Date(),
  };
}

// ---- Threading: find the target ticket ----

function extractTicketIdFromAddress(addresses: string[]): string | null {
  for (const addr of addresses) {
    const match = addr.match(/\+([a-z0-9]+)@/i);
    if (match) return match[1];
  }
  return null;
}

function extractProtocolFromSubject(subject: string): string | null {
  const match = subject.match(/\[#([A-Z0-9-]+)\]/i);
  return match ? match[1] : null;
}

async function resolveTicket(
  email: ParsedEmail,
  companyId: string,
  emailConnectionId: string,
  contactId: string,
): Promise<string> {
  // 1. Reply-to address contains ticketId
  const ticketIdFromAddr = extractTicketIdFromAddress(email.to);
  if (ticketIdFromAddr) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketIdFromAddr, companyId, status: { notIn: ['CLOSED'] } },
    });
    if (ticket) return ticket.id;
  }

  // 2. In-Reply-To / References headers -> match emailMessageId stored in message metadata
  if (email.inReplyTo || (email.references && email.references.length > 0)) {
    const refIds = [...(email.references || [])];
    if (email.inReplyTo && !refIds.includes(email.inReplyTo)) refIds.push(email.inReplyTo);

    for (const refId of refIds.reverse()) {
      const existingMsg = await prisma.message.findFirst({
        where: {
          ticket: { companyId },
          metadata: { path: ['emailMessageId'], equals: refId },
        },
        select: { ticketId: true },
      });
      if (existingMsg) {
        const ticket = await prisma.ticket.findFirst({
          where: { id: existingMsg.ticketId, status: { notIn: ['CLOSED'] } },
        });
        if (ticket) return ticket.id;
      }
    }
  }

  // 3. Subject contains protocol
  const protocol = extractProtocolFromSubject(email.subject);
  if (protocol) {
    const ticket = await prisma.ticket.findFirst({
      where: { protocol, companyId, status: { notIn: ['CLOSED'] } },
    });
    if (ticket) return ticket.id;
  }

  // 4. Check for an existing open email ticket with this contact
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      contactId,
      companyId,
      channel: 'EMAIL',
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (existingTicket) return existingTicket.id;

  // 5. Create new ticket
  const newProtocol = generateProtocol();
  const ticket = await prisma.ticket.create({
    data: {
      protocol: newProtocol,
      subject: email.subject || null,
      channel: 'EMAIL',
      contactId,
      companyId,
      emailConnectionId,
    },
  });
  logger.info(`New email ticket created: ${newProtocol}`, { ticketId: ticket.id });
  return ticket.id;
}

// ---- Contact matching ----

async function resolveContact(
  fromEmail: string,
  fromName: string,
  companyId: string,
): Promise<string> {
  // Try to find by email
  const existing = await prisma.contact.findFirst({
    where: { email: fromEmail, companyId },
  });
  if (existing) {
    if (!existing.name && fromName) {
      await prisma.contact.update({ where: { id: existing.id }, data: { name: fromName } });
    }
    return existing.id;
  }

  // Create new contact (phone is null for email-only contacts)
  const contact = await prisma.contact.create({
    data: {
      email: fromEmail,
      name: fromName || fromEmail,
      companyId,
    },
  });
  logger.info(`New email contact created: ${fromEmail}`, { contactId: contact.id });
  return contact.id;
}

// ---- Main poll function ----

export class ImapService {
  static async poll(emailConnectionId: string): Promise<number> {
    const conn = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: emailConnectionId },
    });

    if (!conn.isActive) return 0;

    let authConfig: { user: string; pass?: string; accessToken?: string };
    if (conn.authType === 'OAUTH2') {
      const accessToken = await GoogleOAuthService.getAccessToken(conn.id);
      authConfig = { user: conn.imapUser || conn.email, accessToken };
    } else {
      authConfig = { user: conn.imapUser, pass: decrypt(conn.imapPassword) };
    }

    const client = new ImapFlow({
      host: conn.imapHost,
      port: conn.imapPort,
      secure: conn.imapTls,
      auth: authConfig,
      logger: false,
    });

    let processed = 0;

    try {
      await client.connect();

      await prisma.emailConnection.update({
        where: { id: emailConnectionId },
        data: { status: 'CONNECTED', lastError: null },
      });

      const lock = await client.getMailboxLock('INBOX');

      try {
        const unseen = await client.search({ seen: false });
        if (!unseen || unseen.length === 0) {
          await prisma.emailConnection.update({
            where: { id: emailConnectionId },
            data: { lastPollAt: new Date() },
          });
          return 0;
        }

        for (const uid of unseen) {
          try {
            const raw = await client.download(uid.toString(), undefined, { uid: true });
            if (!raw || !raw.content) continue;

            const chunks: Buffer[] = [];
            for await (const chunk of raw.content) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);

            const email = await parseRawEmail(buffer);

            // Skip emails from our own address (sent replies)
            if (email.from.address.toLowerCase() === conn.email.toLowerCase()) {
              await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
              continue;
            }

            // Check for duplicate by messageId
            if (email.messageId) {
              const dup = await prisma.message.findFirst({
                where: {
                  ticket: { companyId: conn.companyId },
                  metadata: { path: ['emailMessageId'], equals: email.messageId },
                },
              });
              if (dup) {
                await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
                continue;
              }
            }

            const contactId = await resolveContact(
              email.from.address,
              email.from.name,
              conn.companyId,
            );

            const ticketId = await resolveTicket(email, conn.companyId, emailConnectionId, contactId);

            const sanitizedHtml = sanitizeHtml(email.html, {
              allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
              allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                '*': ['style', 'class'],
                img: ['src', 'alt', 'width', 'height'],
              },
            });

            await prisma.message.create({
              data: {
                type: 'TEXT',
                content: email.text || email.subject,
                htmlContent: sanitizedHtml || null,
                isFromMe: false,
                status: 'RECEIVED',
                ticketId,
                emailConnectionId,
                metadata: {
                  emailMessageId: email.messageId,
                  emailSubject: email.subject,
                  emailFrom: email.from.address,
                  emailFromName: email.from.name,
                },
              },
            });

            // Update ticket updatedAt
            await prisma.ticket.update({
              where: { id: ticketId },
              data: { updatedAt: new Date() },
            });

            // Update contact lastMessageAt
            await prisma.contact.update({
              where: { id: contactId },
              data: { lastMessageAt: new Date() },
            });

            // Emit socket events
            const io = (global as any).__io;
            if (io) {
              const updatedTicket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { contact: true, emailConnection: true },
              });
              io.to(`company:${conn.companyId}`).emit('ticket:updated', updatedTicket);
            }

            await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
            processed++;
          } catch (msgErr: any) {
            logger.warn(`IMAP: error processing email uid=${uid}`, { error: msgErr.message });
          }
        }
      } finally {
        lock.release();
      }

      await prisma.emailConnection.update({
        where: { id: emailConnectionId },
        data: { lastPollAt: new Date() },
      });
    } catch (err: any) {
      logger.error(`IMAP poll failed for connection ${emailConnectionId}`, { error: err.message });
      await prisma.emailConnection.update({
        where: { id: emailConnectionId },
        data: { status: 'ERROR', lastError: err.message },
      }).catch(() => {});
      throw err;
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }

    return processed;
  }

  static async testConnection(emailConnectionId: string): Promise<boolean> {
    const conn = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: emailConnectionId },
    });

    let authConfig: { user: string; pass?: string; accessToken?: string };
    if (conn.authType === 'OAUTH2') {
      try {
        const accessToken = await GoogleOAuthService.getAccessToken(conn.id);
        authConfig = { user: conn.imapUser || conn.email, accessToken };
      } catch {
        return false;
      }
    } else {
      authConfig = { user: conn.imapUser, pass: decrypt(conn.imapPassword) };
    }

    const client = new ImapFlow({
      host: conn.imapHost,
      port: conn.imapPort,
      secure: conn.imapTls,
      auth: authConfig,
      logger: false,
    });

    try {
      await client.connect();
      await client.logout();
      return true;
    } catch {
      return false;
    }
  }
}
