import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { generateProtocol } from '../utils/protocol.js';
import { toCanonicalPhone } from '../utils/canonical-phone.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';

const router = Router();

const MAX_IMPORT_ROWS = 5000;
const MAX_IMPORT_FILE_SIZE = 1024 * 1024; // 1 MB

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const mimetypeOk =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/x-csv';
    const nameOk = file.originalname?.toLowerCase().endsWith('.csv') || file.originalname?.toLowerCase().endsWith('.txt');
    if (mimetypeOk || nameOk) cb(null, true);
    else cb(new Error('Apenas arquivos CSV são aceitos (.csv ou .txt)'));
  },
});

/** Normalize phone to digits only; if 10 digits assume Brazil (55). */
function normalizePhoneForImport(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.length === 10) return '55' + digits;
  return digits;
}

type DispatchCsvColumnMapping = {
  phoneColumn: number;
  nameColumn: number | null;
  messageColumn: number | null;
};

/**
 * Parse CSV buffer into rows { phone, name?, message? }.
 * When mapping + separator are provided (from UI), first line = header, data from line 1 (same as frontend preview).
 * If not, auto-detects separator, header and columns by common names.
 * Returns { rows, debug } when debug is requested (for error diagnostics).
 */
function parseDispatchCsv(
  buffer: Buffer,
  mapping?: DispatchCsvColumnMapping,
  explicitSeparator?: string,
  options?: { debug: boolean }
): { phone: string; name?: string; message?: string }[] | { rows: { phone: string; name?: string; message?: string }[]; debug: Record<string, unknown> } {
  let text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.trim().split('\n').filter((l) => l.trim());
  const debug: Record<string, unknown> = { lineCount: lines.length, firstLine: lines[0]?.slice(0, 100) };

  if (lines.length === 0) {
    if (options?.debug) return { rows: [], debug };
    return [];
  }

  const first = lines[0];
  const separator =
    explicitSeparator === ';' || explicitSeparator === ','
      ? explicitSeparator
      : first.includes(';')
        ? ';'
        : ',';
  debug.separator = separator;
  debug.explicitSeparator = explicitSeparator;

  const parts0 = first.split(separator).map((p) => p.trim());
  const lower0 = parts0.map((p) => p.toLowerCase());

  let startIndex: number;
  let phoneCol: number;
  let nameCol: number;
  let msgCol: number;

  if (mapping) {
    startIndex = 1;
    phoneCol = mapping.phoneColumn;
    nameCol = mapping.nameColumn ?? -1;
    msgCol = mapping.messageColumn ?? -1;
    debug.mapping = mapping;
    debug.startIndex = startIndex;
  } else {
    const isHeader =
      lower0[0] === 'telefone' || lower0[0] === 'phone' || lower0[0] === 'nome' || lower0[0] === 'name' || lower0[0] === 'mensagem' || lower0[0] === 'message';
    startIndex = isHeader ? 1 : 0;
    phoneCol = lower0.indexOf('telefone') >= 0 ? lower0.indexOf('telefone') : lower0.indexOf('phone') >= 0 ? lower0.indexOf('phone') : 0;
    nameCol = lower0.indexOf('nome') >= 0 ? lower0.indexOf('nome') : lower0.indexOf('name') >= 0 ? lower0.indexOf('name') : 1;
    msgCol = lower0.indexOf('mensagem') >= 0 ? lower0.indexOf('mensagem') : lower0.indexOf('message') >= 0 ? lower0.indexOf('message') : 2;
  }

  const collect = (from: number) => {
    const out: { phone: string; name?: string; message?: string }[] = [];
    for (let i = from; i < lines.length && out.length < MAX_IMPORT_ROWS; i++) {
      const parts = lines[i].split(separator).map((p) => p.trim());
      const rawPhone = parts[phoneCol] ?? '';
      const phone = normalizePhoneForImport(rawPhone);
      if (phone.length < 10) continue;
      out.push({
        phone,
        name: nameCol >= 0 && parts[nameCol] !== undefined ? parts[nameCol] || undefined : undefined,
        message: msgCol >= 0 && parts[msgCol] !== undefined ? parts[msgCol] || undefined : undefined,
      });
    }
    return out;
  };

  let rows = collect(startIndex);
  if (mapping && rows.length === 0 && lines.length > 0) {
    rows = collect(0);
  }

  if (options?.debug && lines.length > 1) {
    const firstDataParts = lines[startIndex]?.split(separator).map((p) => p.trim()) ?? [];
    debug.firstDataLineParts = firstDataParts;
    debug.rawPhoneAtCol = firstDataParts[phoneCol];
    debug.normalizedPhone = normalizePhoneForImport(firstDataParts[phoneCol] ?? '');
  }

  if (options?.debug) {
    debug.rowsLength = rows.length;
    return { rows, debug };
  }
  return rows;
}

/**
 * Processa contatos em tickets + mensagem de disparo.
 * Apenas grava no banco: NUNCA envia mensagem para o cliente (WhatsApp/Instagram).
 * A mensagem criada é só para o atendente ver o que foi enviado no disparo; quando o cliente responder, a conversa já aparece com histórico.
 */
async function processCampaignContacts(
  companyId: string,
  connection: { id: string },
  commercialDept: { id: string },
  campaignId: number,
  dispatchedAt: Date,
  contacts: { phone: string; name?: string; message?: string }[],
  defaultMessage: string,
  options: { addMessageToExistingTicket?: boolean } = {}
): Promise<{ ticketsCreated: number; ticketsUpdated: number }> {
  const { addMessageToExistingTicket = false } = options;
  let ticketsCreated = 0;
  let ticketsUpdated = 0;
  const BATCH = 200;

  const seenPhones = new Set<string>();
  const deduped = contacts.filter((c) => {
    const normalizedPhone = c.phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) return false;
    const key = normalizedPhone.length === 10 ? '55' + normalizedPhone : normalizedPhone;
    if (seenPhones.has(key)) return false;
    seenPhones.add(key);
    return true;
  });

  for (let i = 0; i < deduped.length; i += BATCH) {
    const chunk = deduped.slice(i, i + BATCH);
    for (const c of chunk) {
      const normalizedPhone = c.phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) continue;

      const canonicalPhone = toCanonicalPhone(normalizedPhone);
      const searchPhones = [normalizedPhone];
      if (normalizedPhone.length === 12 && normalizedPhone.startsWith('55')) {
        searchPhones.push(normalizedPhone.slice(2));
      } else if (normalizedPhone.length === 10) {
        searchPhones.push('55' + normalizedPhone);
      }

      let contact = await prisma.contact.findFirst({
        where: {
          companyId,
          OR: [
            { phone: { in: searchPhones } },
            ...(canonicalPhone ? [{ canonicalPhone }] : []),
          ],
        },
      });

      if (contact) {
        const updates: { name?: string } = {};
        if (c.name != null && c.name !== contact.name) updates.name = c.name;
        if (Object.keys(updates).length > 0) {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: updates,
          });
        }
      } else {
        try {
          contact = await prisma.contact.create({
            data: {
              companyId,
              phone: normalizedPhone,
              name: c.name || undefined,
              ...(canonicalPhone ? { canonicalPhone } : {}),
            },
          });
        } catch (err: any) {
          if (err?.code === 'P2002') {
            contact = await prisma.contact.findFirst({
              where: {
                companyId,
                OR: [
                  { phone: { in: searchPhones } },
                  ...(canonicalPhone ? [{ canonicalPhone }] : []),
                ],
              },
            });
            if (!contact) throw err;
          } else {
            throw err;
          }
        }
      }

      const openTicket = await prisma.ticket.findFirst({
        where: {
          contactId: contact.id,
          connectionId: connection.id,
          status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
        },
      });

      const messageText = (c.message && c.message.trim()) ? c.message.trim() : defaultMessage;

      if (openTicket) {
        await prisma.ticket.update({
          where: { id: openTicket.id },
          data: {
            campaignId,
            campaignDispatchedAt: dispatchedAt,
          },
        });
        if (addMessageToExistingTicket && messageText) {
          await prisma.message.create({
            data: {
              type: 'TEXT',
              content: messageText,
              isFromMe: true,
              status: 'DELIVERED',
              ticketId: openTicket.id,
              connectionId: connection.id,
            },
          });
        }
        ticketsUpdated++;
        continue;
      }

      const protocol = generateProtocol();
      let ticket: { id: string };
      try {
        ticket = await prisma.ticket.create({
          data: {
            protocol,
            status: 'PENDING',
            priority: 'MEDIUM',
            contactId: contact.id,
            connectionId: connection.id,
            companyId,
            departmentId: commercialDept.id,
            assignedToId: null,
            campaignId,
            campaignDispatchedAt: dispatchedAt,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          const existing = await prisma.ticket.findFirst({
            where: {
              contactId: contact.id,
              connectionId: connection.id,
            },
            orderBy: { createdAt: 'desc' },
          });
          if (existing) {
            await prisma.ticket.update({
              where: { id: existing.id },
              data: {
                status: 'PENDING',
                campaignId,
                campaignDispatchedAt: dispatchedAt,
                departmentId: commercialDept.id,
              },
            });
            if (addMessageToExistingTicket && messageText) {
              await prisma.message.create({
                data: {
                  type: 'TEXT',
                  content: messageText || '(Mensagem do disparo)',
                  isFromMe: true,
                  status: 'DELIVERED',
                  ticketId: existing.id,
                  connectionId: connection.id,
                },
              });
            }
            ticketsUpdated++;
            continue;
          }
        }
        throw err;
      }

      await prisma.message.create({
        data: {
          type: 'TEXT',
          content: messageText || '(Mensagem do disparo)',
          isFromMe: true,
          status: 'DELIVERED',
          ticketId: ticket.id,
          connectionId: connection.id,
        },
      });

      ticketsCreated++;
    }
  }

  return { ticketsCreated, ticketsUpdated };
}

const CampaignDispatchedSchema = z.object({
  event: z.literal('campaign.dispatched'),
  dispatchedAt: z.string().datetime({ message: 'dispatchedAt must be ISO 8601' }),
  campaignId: z.number().int().positive(),
  campaignName: z.string().min(1),
  company: z.string().min(1),
  message: z.string(),
  contacts: z.array(
    z.object({
      name: z.string().nullable().optional(),
      phone: z.string().min(1),
    })
  ),
});

/** Optional: validate Bearer token when CHAT_WEBHOOK_SECRET is set */
function optionalWebhookAuth(req: any, res: any, next: any) {
  const secret = process.env.CHAT_WEBHOOK_SECRET;
  if (!secret) return next();
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }
  next();
}

router.post('/campaign-dispatched', optionalWebhookAuth, async (req, res, next) => {
  try {
    const payload = CampaignDispatchedSchema.parse(req.body);
    const dispatchedAt = new Date(payload.dispatchedAt);

    const company = await prisma.company.findFirst({
      where: {
        name: { contains: payload.company.trim(), mode: 'insensitive' },
        isActive: true,
      },
    });

    if (!company) {
      return res.status(400).json({
        error: `Empresa não encontrada: "${payload.company}". Verifique o nome no payload.`,
      });
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        status: 'CONNECTED',
      },
      orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
    });

    const connectionToUse =
      connection ||
      (await prisma.whatsAppConnection.findFirst({
        where: { companyId: company.id, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
      }));

    if (!connectionToUse) {
      return res.status(400).json({
        error: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa',
      });
    }

    const commercialDept = await prisma.department.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        name: { contains: 'comercial', mode: 'insensitive' },
      },
      orderBy: { order: 'asc' },
    });

    if (!commercialDept) {
      return res.status(400).json({
        error: 'Departamento Comercial não encontrado para esta empresa',
      });
    }

    const existing = await prisma.campaignDispatch.findUnique({
      where: {
        companyId_campaignId_dispatchedAt: {
          companyId: company.id,
          campaignId: payload.campaignId,
          dispatchedAt,
        },
      },
    });

    if (existing) {
      return res.status(200).json({ ok: true, alreadyProcessed: true });
    }

    await prisma.campaignDispatch.create({
      data: {
        companyId: company.id,
        campaignId: payload.campaignId,
        dispatchedAt,
      },
    });

    const contactsWithMessage = payload.contacts.map((c) => ({
      phone: c.phone,
      name: c.name ?? undefined,
      message: payload.message,
    }));
    const { ticketsCreated, ticketsUpdated } = await processCampaignContacts(
      company.id,
      connectionToUse,
      commercialDept,
      payload.campaignId,
      dispatchedAt,
      contactsWithMessage,
      payload.message,
      { addMessageToExistingTicket: false }
    );

    return res.status(200).json({ ok: true, ticketsCreated, ticketsUpdated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.errors,
      });
    }
    logger.error('Campaign dispatch webhook error:', error);
    next(error);
  }
});

/**
 * Importação de planilha de disparo (autenticada).
 * Recebe JSON: { contacts: [{ phone, name?, message? }], message?, campaignId?, campaignName?, dispatchedAt? }.
 * Cria/atualiza conversas e grava a mensagem no histórico. NÃO envia mensagem para os clientes.
 */
router.post(
  '/import',
  authenticate,
  ensureTenant,
  async (req: Request, res: Response, next: (err: any) => void) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const body = (req as any).body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({
          error: 'Envie o body em JSON com o array "contacts" (ex.: { "contacts": [{ "phone": "11999998888", "name": "Nome" }] }).',
        });
      }

      const rawContacts = Array.isArray(body.contacts) ? body.contacts : [];
      const contacts: { phone: string; name?: string; message?: string }[] = rawContacts
        .filter((c: any) => c && typeof c.phone === 'string' && c.phone.replace(/\D/g, '').length >= 10)
        .map((c: any) => {
          const digits = c.phone.replace(/\D/g, '');
          return {
            phone: digits.length === 10 ? '55' + digits : digits,
            name: typeof c.name === 'string' ? c.name.trim() || undefined : undefined,
            message: typeof c.message === 'string' ? c.message.trim() || undefined : undefined,
          };
        })
        .slice(0, MAX_IMPORT_ROWS);

      if (contacts.length === 0) {
        return res.status(400).json({
          error: 'Envie pelo menos um contato com telefone válido (10+ dígitos).',
        });
      }

      const defaultMessage = typeof (req as any).body?.message === 'string' ? (req as any).body.message.trim() : '';
      const rawCampaignId = (req as any).body?.campaignId;
      const campaignId = rawCampaignId != null && rawCampaignId !== '' ? Number(rawCampaignId) : Math.floor(Date.now() / 1000);
      const dispatchedAtStr = (req as any).body?.dispatchedAt;
      const dispatchedAt = dispatchedAtStr ? new Date(dispatchedAtStr) : new Date();

      if (Number.isNaN(campaignId) || campaignId < 1) {
        return res.status(400).json({ error: 'ID da campanha deve ser um número positivo.' });
      }

      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          companyId,
          isActive: true,
          status: 'CONNECTED',
        },
        orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
      });

      const connectionToUse =
        connection ||
        (await prisma.whatsAppConnection.findFirst({
          where: { companyId, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
        }));

      if (!connectionToUse) {
        return res.status(400).json({
          error: 'Nenhuma conexão WhatsApp ativa encontrada. Conecte uma conexão primeiro.',
        });
      }

      const commercialDept = await prisma.department.findFirst({
        where: {
          companyId,
          isActive: true,
          name: { contains: 'comercial', mode: 'insensitive' },
        },
        orderBy: { order: 'asc' },
      });

      if (!commercialDept) {
        return res.status(400).json({
          error: 'Departamento Comercial não encontrado. Crie um departamento com "comercial" no nome.',
        });
      }

      const { ticketsCreated, ticketsUpdated } = await processCampaignContacts(
        companyId,
        connectionToUse,
        commercialDept,
        campaignId,
        dispatchedAt,
        contacts,
        defaultMessage || '(Mensagem do disparo)',
        { addMessageToExistingTicket: true }
      );

      logger.info(`Campaign import: company=${companyId} campaignId=${campaignId} created=${ticketsCreated} updated=${ticketsUpdated}`);

      return res.status(200).json({
        ok: true,
        ticketsCreated,
        ticketsUpdated,
      });
    } catch (error) {
      logger.error('Campaign dispatch import error:', error);
      next(error);
    }
  }
);

export const campaignDispatchRouter = router;
