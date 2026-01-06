import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { logger } from '../config/logger.js';

const router = Router();

// Validation schemas
const createFAQSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required'),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  departmentId: z.string().cuid().optional().nullable(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

const updateFAQSchema = createFAQSchema.partial();

// Get all FAQ items
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
        { question: { contains: search as string, mode: 'insensitive' } },
        { answer: { contains: search as string, mode: 'insensitive' } },
        { keywords: { has: search as string } },
      ];
    }

    const items = await prisma.fAQ.findMany({
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
      orderBy: [{ useCount: 'desc' }, { order: 'asc' }, { question: 'asc' }],
    });

    // Get categories for filtering
    const categories = await prisma.fAQ.findMany({
      where: { companyId: req.user!.companyId },
      select: { category: true },
      distinct: ['category'],
    });

    // Get stats
    const stats = await prisma.fAQ.aggregate({
      where: { companyId: req.user!.companyId },
      _sum: { useCount: true },
      _count: true,
    });

    res.json({
      items,
      categories: categories.map(c => c.category).filter(Boolean),
      stats: {
        total: stats._count,
        totalUsage: stats._sum.useCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single FAQ item
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const item = await prisma.fAQ.findFirst({
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
      throw new NotFoundError('FAQ item not found');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Create FAQ item
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createFAQSchema.parse(req.body);

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

    // Auto-generate keywords from question if not provided
    if (!data.keywords || data.keywords.length === 0) {
      data.keywords = extractKeywords(data.question);
    }

    const item = await prisma.fAQ.create({
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

    logger.info(`FAQ item created: ${item.id}`);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Update FAQ item
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateFAQSchema.parse(req.body);

    // Check if item exists and belongs to company
    const existing = await prisma.fAQ.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('FAQ item not found');
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

    const item = await prisma.fAQ.update({
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

    logger.info(`FAQ item updated: ${item.id}`);
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Delete FAQ item
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Check if item exists and belongs to company
    const existing = await prisma.fAQ.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('FAQ item not found');
    }

    await prisma.fAQ.delete({
      where: { id: req.params.id },
    });

    logger.info(`FAQ item deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Increment usage count (called when FAQ is used in AI response)
router.post('/:id/use', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const item = await prisma.fAQ.updateMany({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        useCount: { increment: 1 },
      },
    });

    if (item.count === 0) {
      throw new NotFoundError('FAQ item not found');
    }

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
        prisma.fAQ.updateMany({
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

// Search FAQs by keywords (for AI matching)
router.get('/search/match', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { query, departmentId, limit = '5' } = req.query;

    if (!query) {
      return res.json({ items: [] });
    }

    const keywords = extractKeywords(query as string);
    
    const whereClause: any = {
      companyId: req.user!.companyId,
      isActive: true,
    };

    if (departmentId) {
      whereClause.OR = [
        { departmentId: null },
        { departmentId: departmentId as string },
      ];
    }

    const items = await prisma.fAQ.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Score items by keyword matching
    const scoredItems = items.map(item => {
      let score = 0;
      const itemText = `${item.question} ${item.answer} ${item.keywords?.join(' ') || ''}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (itemText.includes(keyword)) {
          score += 1;
          // Bonus for keyword in actual keywords array
          if (item.keywords?.some(k => k.toLowerCase().includes(keyword))) {
            score += 0.5;
          }
          // Bonus for keyword in question
          if (item.question.toLowerCase().includes(keyword)) {
            score += 0.5;
          }
        }
      }
      
      return { ...item, score };
    });

    // Sort by score and return top matches
    const topMatches = scoredItems
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit as string));

    res.json({ items: topMatches });
  } catch (error) {
    next(error);
  }
});

// Helper function to extract keywords
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com',
    'não', 'por', 'mais', 'como', 'mas', 'foi', 'ou', 'ser', 'quando',
    'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo',
    'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo',
    'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'estão',
    'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às',
    'minha', 'têm', 'numa', 'pelos', 'elas', 'qual', 'lhe', 'dele', 'dela',
    'quero', 'preciso', 'gostaria', 'posso', 'pode', 'vocês', 'aqui',
    'oi', 'olá', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

export { router as faqRouter };







