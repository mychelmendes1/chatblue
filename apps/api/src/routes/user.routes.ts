import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
  isAI: z.boolean().optional(),
  aiConfig: z.object({
    provider: z.string(),
    model: z.string(),
    systemPrompt: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number(),
  }).optional(),
  departmentIds: z.array(z.string().cuid()).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });

// List users
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { departmentId, isAI, isActive } = req.query;

    const users = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(departmentId && {
          departments: {
            some: { departmentId: departmentId as string },
          },
        }),
        ...(isAI !== undefined && { isAI: isAI === 'true' }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isAI: true,
        isActive: true,
        isOnline: true,
        lastSeen: true,
        departments: {
          include: {
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
            tickets: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get user
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isAI: true,
        aiConfig: true,
        isActive: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'AGENT',
        isAI: data.isAI || false,
        aiConfig: data.aiConfig,
        companyId: req.user!.companyId,
        departments: data.departmentIds
          ? {
              create: data.departmentIds.map((deptId) => ({
                departmentId: deptId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAI: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        ...data,
        departments: data.departmentIds
          ? {
              deleteMany: {},
              create: data.departmentIds.map((deptId) => ({
                departmentId: deptId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAI: true,
        aiConfig: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update AI config
router.put('/:id/ai-config', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const aiConfigSchema = z.object({
      provider: z.string(),
      model: z.string(),
      systemPrompt: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number(),
      triggerKeywords: z.array(z.string()).optional(),
      maxInteractionsBeforeTransfer: z.number().optional(),
    });

    const aiConfig = aiConfigSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        isAI: true,
      },
      data: { aiConfig },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: { isActive: false },
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };
