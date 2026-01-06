import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { logger } from '../config/logger.js';

const router = Router();

// Validation schemas
const createKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  departmentId: z.string().cuid().optional().nullable(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

const updateKnowledgeSchema = createKnowledgeSchema.partial();

// Get all knowledge base items
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { departmentId, category, search, isActive } = req.query;

    const whereClause: any = {
      companyId: req.user!.companyId,
    };

    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }

    if (category) {
      whereClause.category = category as string;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    const items = await prisma.knowledgeBase.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });

    // Get categories for filtering
    const categories = await prisma.knowledgeBase.findMany({
      where: { companyId: req.user!.companyId },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({
      items,
      categories: categories.map(c => c.category).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});

// Get single knowledge base item
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const item = await prisma.knowledgeBase.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Knowledge base item not found');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Create knowledge base item
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createKnowledgeSchema.parse(req.body);

    // Verify department belongs to company if provided
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          companyId: req.user!.companyId,
        },
      });

      if (!department) {
        throw new ValidationError('Department not found');
      }
    }

    const item = await prisma.knowledgeBase.create({
      data: {
        ...data,
        companyId: req.user!.companyId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logger.info(`Knowledge base item created: ${item.id}`);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Update knowledge base item
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateKnowledgeSchema.parse(req.body);

    // Check if item exists and belongs to company
    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Knowledge base item not found');
    }

    // Verify department belongs to company if provided
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          companyId: req.user!.companyId,
        },
      });

      if (!department) {
        throw new ValidationError('Department not found');
      }
    }

    const item = await prisma.knowledgeBase.update({
      where: { id: req.params.id },
      data,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logger.info(`Knowledge base item updated: ${item.id}`);
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Delete knowledge base item
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Check if item exists and belongs to company
    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Knowledge base item not found');
    }

    await prisma.knowledgeBase.delete({
      where: { id: req.params.id },
    });

    logger.info(`Knowledge base item deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Bulk update order
router.put('/order/bulk', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const schema = z.array(z.object({
      id: z.string().cuid(),
      order: z.number(),
    }));

    const items = schema.parse(req.body);

    // Update all items in transaction
    await prisma.$transaction(
      items.map(item =>
        prisma.knowledgeBase.updateMany({
          where: {
            id: item.id,
            companyId: req.user!.companyId,
          },
          data: { order: item.order },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Import from PDF (uses existing PDF processing)
router.post('/import-pdf', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
      departmentId: z.string().cuid().optional().nullable(),
    });

    const data = schema.parse(req.body);

    const item = await prisma.knowledgeBase.create({
      data: {
        ...data,
        companyId: req.user!.companyId,
        tags: ['imported', 'pdf'],
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logger.info(`Knowledge base item imported from PDF: ${item.id}`);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

export { router as knowledgeRouter };







