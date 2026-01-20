import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';

const router = Router();

const departmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().optional(),
  parentId: z.union([z.string().min(1), z.null()]).optional(),
});

// List departments
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isOnline: true,
                isAI: true,
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
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    res.json(departments);
  } catch (error) {
    next(error);
  }
});

// Get department hierarchy tree
router.get('/tree', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
        parentId: null, // Start from root
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // 3 levels deep
              },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    res.json(departments);
  } catch (error) {
    next(error);
  }
});

// Get single department
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const department = await prisma.department.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        parent: true,
        children: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                isOnline: true,
                isAI: true,
                role: true,
              },
            },
          },
        },
        slaConfig: true,
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    res.json(department);
  } catch (error) {
    next(error);
  }
});

// Create department
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    console.log('Creating department with body:', JSON.stringify(req.body));
    
    const data = departmentSchema.parse(req.body);
    console.log('Parsed data:', JSON.stringify(data));

    const department = await prisma.department.create({
      data: {
        ...data,
        company: { connect: { id: req.user!.companyId } },
      } as any,
    });

    res.status(201).json(department);
  } catch (error: any) {
    console.error('Error creating department:', error?.message || error);
    if (error?.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors));
    }
    next(error);
  }
});

// Update department
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = departmentSchema.partial().parse(req.body);

    const department = await prisma.department.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data,
    });

    res.json(department);
  } catch (error) {
    next(error);
  }
});

// Delete department
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Check if department has active tickets
    const ticketCount = await prisma.ticket.count({
      where: {
        departmentId: req.params.id,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
      },
    });

    if (ticketCount > 0) {
      throw new NotFoundError('Cannot delete department with active tickets');
    }

    await prisma.department.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: { isActive: false },
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add users to department
router.post('/:id/users', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { userIds, isManager } = z.object({
      userIds: z.array(z.string().cuid()),
      isManager: z.boolean().optional(),
    }).parse(req.body);

    await prisma.userDepartment.createMany({
      data: userIds.map((userId) => ({
        userId,
        departmentId: req.params.id,
        isManager: isManager || false,
      })),
      skipDuplicates: true,
    });

    res.json({ message: 'Users added successfully' });
  } catch (error) {
    next(error);
  }
});

// Remove user from department
router.delete('/:id/users/:userId', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    await prisma.userDepartment.deleteMany({
      where: {
        departmentId: req.params.id,
        userId: req.params.userId,
      },
    });

    res.json({ message: 'User removed from department' });
  } catch (error) {
    next(error);
  }
});

export { router as departmentRouter };
