import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
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

export { router as contactRouter };
