import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { NotionService } from '../services/notion/notion.service.js';

const router = Router();

// List contacts
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const {
      search,
      isClient,
      tag,
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {
      companyId: req.user!.companyId,
      isActive: true,
      ...(isClient !== undefined && { isClient: isClient === 'true' }),
      ...(tag && { tags: { has: tag as string } }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          _count: {
            select: {
              tickets: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      contacts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get contact
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

// Update contact
router.put('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      customFields: z.record(z.any()).optional(),
    }).parse(req.body);

    const contact = await prisma.contact.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'CONTACT_UPDATED',
        description: 'Contact information updated',
        userId: req.user!.userId,
        metadata: data,
      },
    });

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

// Sync contact with Notion
router.post('/:id/sync-notion', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    // Get company settings for Notion
    const settings = await prisma.companySettings.findUnique({
      where: { companyId: req.user!.companyId },
    });

    if (!settings?.notionApiKey || !settings?.notionDatabaseId) {
      throw new NotFoundError('Notion integration not configured');
    }

    // Sync with Notion
    const notionService = new NotionService(settings.notionApiKey);
    const notionData = await notionService.findContact(
      settings.notionDatabaseId,
      contact.phone,
      contact.email
    );

    if (notionData) {
      // Update contact with Notion data
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          notionPageId: notionData.pageId,
          isClient: notionData.isClient,
          isExClient: notionData.isExClient,
          clientSince: notionData.clientSince,
        },
      });

      res.json(updatedContact);
    } else {
      res.json({ ...contact, notionStatus: 'not_found' });
    }
  } catch (error) {
    next(error);
  }
});

// Get contact by phone
router.get('/phone/:phone', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        phone: req.params.phone,
        companyId: req.user!.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

// Add tag to contact
router.post('/:id/tags', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { tag } = z.object({ tag: z.string().min(1) }).parse(req.body);

    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: [...new Set([...contact.tags, tag])],
      },
    });

    res.json(updatedContact);
  } catch (error) {
    next(error);
  }
});

// Remove tag from contact
router.delete('/:id/tags/:tag', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: contact.tags.filter((t) => t !== req.params.tag),
      },
    });

    res.json(updatedContact);
  } catch (error) {
    next(error);
  }
});

// Create contact
router.post('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      phone: z.string().min(10),
      name: z.string().optional(),
      email: z.string().email().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    // Normalize phone number
    const normalizedPhone = data.phone.replace(/\D/g, '');

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        phone: normalizedPhone,
        companyId: req.user!.companyId,
      },
    });

    if (existingContact) {
      throw new ValidationError('Contact with this phone already exists');
    }

    const contact = await prisma.contact.create({
      data: {
        phone: normalizedPhone,
        name: data.name,
        email: data.email,
        tags: data.tags || [],
        notes: data.notes,
        companyId: req.user!.companyId,
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
});

// Import contacts in batch
router.post('/import', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const importSchema = z.object({
      contacts: z.array(z.object({
        phone: z.string().min(10),
        name: z.string().optional(),
        email: z.string().email().optional().nullable(),
      })),
      skipDuplicates: z.boolean().optional().default(true),
    });

    const { contacts, skipDuplicates } = importSchema.parse(req.body);

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ phone: string; error: string }>,
    };

    for (const contact of contacts) {
      try {
        // Normalize phone number
        const normalizedPhone = contact.phone.replace(/\D/g, '');

        if (!normalizedPhone || normalizedPhone.length < 10) {
          results.errors.push({ phone: contact.phone, error: 'Invalid phone number' });
          continue;
        }

        // Check if contact already exists
        const existingContact = await prisma.contact.findFirst({
          where: {
            phone: normalizedPhone,
            companyId: req.user!.companyId,
          },
        });

        if (existingContact) {
          if (skipDuplicates) {
            results.skipped++;
            continue;
          } else {
            // Update existing contact
            await prisma.contact.update({
              where: { id: existingContact.id },
              data: {
                name: contact.name || existingContact.name,
                email: contact.email || existingContact.email,
              },
            });
            results.imported++;
            continue;
          }
        }

        // Create new contact
        await prisma.contact.create({
          data: {
            phone: normalizedPhone,
            name: contact.name,
            email: contact.email || undefined,
            companyId: req.user!.companyId,
          },
        });

        results.imported++;
      } catch (error: any) {
        results.errors.push({
          phone: contact.phone,
          error: error.message || 'Unknown error',
        });
      }
    }

    res.json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`,
      ...results,
    });
  } catch (error) {
    next(error);
  }
});

// Search contacts for autocomplete
router.get('/search', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const contacts = await prisma.contact.findMany({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        avatar: true,
        isClient: true,
      },
      take: parseInt(limit as string),
      orderBy: { updatedAt: 'desc' },
    });

    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

// Temporary route to fix contact phone numbers (remove after running)
router.post('/fix-phones', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    function normalizePhoneNumber(phone: string): string {
      if (!phone) return phone;
      let normalized = phone.replace(/@[^@]*$/g, '');
      normalized = normalized.replace(/\D/g, '');
      return normalized;
    }

    const contacts = await prisma.contact.findMany({
      where: {
        companyId: req.user!.companyId,
        phone: { contains: '@' },
      },
    });

    let fixed = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        const normalized = normalizePhoneNumber(contact.phone);
        if (!normalized || normalized.length === 0) {
          errors++;
          continue;
        }

        const existing = await prisma.contact.findFirst({
          where: {
            companyId: req.user!.companyId,
            phone: normalized,
            id: { not: contact.id },
          },
        });

        if (existing) {
          errors++;
          continue;
        }

        await prisma.contact.update({
          where: { id: contact.id },
          data: { phone: normalized },
        });

        fixed++;
      } catch (error) {
        errors++;
      }
    }

    res.json({ 
      message: `Fixed ${fixed} contacts, ${errors} errors`,
      fixed,
      errors,
      total: contacts.length,
    });
  } catch (error) {
    next(error);
  }
});

export { router as contactRouter };
