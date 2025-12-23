import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireSuperAdmin } from '../middlewares/auth.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
});

const updateCompanySchema = createCompanySchema.partial();

// List all companies (Super Admin only)
router.get('/', authenticate, requireSuperAdmin, async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            connections: true,
            tickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(companies);
  } catch (error) {
    next(error);
  }
});

// Get single company
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            departments: true,
            connections: true,
            contacts: true,
            tickets: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Only super admin or company members can view
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.companyId !== company.id) {
      throw new NotFoundError('Company not found');
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
});

// Create company (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const data = createCompanySchema.parse(req.body);

    const company = await prisma.company.create({
      data: {
        ...data,
        settings: {
          create: {}, // Create default settings
        },
      },
      include: {
        settings: true,
      },
    });

    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
});

// Update company
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateCompanySchema.parse(req.body);

    // Only super admin or company admin can update
    if (req.user!.role !== 'SUPER_ADMIN') {
      if (req.user!.companyId !== req.params.id || req.user!.role !== 'ADMIN') {
        throw new NotFoundError('Company not found');
      }
    }

    const company = await prisma.company.update({
      where: { id: req.params.id },
      data,
    });

    res.json(company);
  } catch (error) {
    next(error);
  }
});

// Deactivate company (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    await prisma.company.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Company deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as companyRouter };
