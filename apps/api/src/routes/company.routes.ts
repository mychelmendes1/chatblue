import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireSuperAdmin, requireAdmin } from '../middlewares/auth.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  logo: z.union([z.string().url('URL do logo inválida'), z.literal('')]).optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional().default('BASIC'),
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

// List all active companies (for admin to assign user access)
// Get all active companies (Admin only)
// Note: No ensureTenant here because we want to list ALL companies for admin to assign access
router.get('/all/active', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
      },
      orderBy: { name: 'asc' },
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
// Note: No ensureTenant here because we're creating a NEW company, not accessing an existing one
router.post('/', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = createCompanySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new ValidationError(`Validation error: ${errors}`);
    }

    const data = validationResult.data;

    // Check if slug already exists
    const existingCompany = await prisma.company.findUnique({
      where: { slug: data.slug },
    });

    if (existingCompany) {
      throw new ValidationError('Uma empresa com este slug já existe');
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'BASIC',
        ...(data.logo && data.logo.trim() ? { logo: data.logo } : {}),
        settings: {
          create: {}, // Create default settings
        },
      },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            connections: true,
            tickets: true,
          },
        },
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
