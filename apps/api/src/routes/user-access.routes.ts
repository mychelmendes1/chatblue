import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../middlewares/error.middleware.js';

const router = Router();

// List all user access requests for company (Admin only)
router.get('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { status } = req.query;

    const userAccess = await prisma.userCompany.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            isActive: true,
            createdAt: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(userAccess);
  } catch (error) {
    next(error);
  }
});

// Request access to a company
router.post('/request', authenticate, async (req, res, next) => {
  try {
    const { companyId } = z.object({
      companyId: z.string().cuid(),
    }).parse(req.body);

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Check if user already has access or pending request
    const existingAccess = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: req.user!.userId,
          companyId,
        },
      },
    });

    if (existingAccess) {
      if (existingAccess.status === 'APPROVED') {
        throw new ValidationError('You already have access to this company');
      }
      if (existingAccess.status === 'PENDING') {
        throw new ValidationError('You already have a pending request for this company');
      }
      if (existingAccess.status === 'REJECTED') {
        // Allow re-request if previously rejected
        const updated = await prisma.userCompany.update({
          where: { id: existingAccess.id },
          data: {
            status: 'PENDING',
            approvedById: null,
            approvedAt: null,
          },
        });
        return res.json(updated);
      }
    }

    const accessRequest = await prisma.userCompany.create({
      data: {
        userId: req.user!.userId,
        companyId,
        role: 'USER',
        status: 'PENDING',
      },
    });

    res.status(201).json(accessRequest);
  } catch (error) {
    next(error);
  }
});

// Approve user access (Admin only)
router.post('/:id/approve', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
    }).parse(req.body);

    const accessRequest = await prisma.userCompany.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: 'PENDING',
      },
    });

    if (!accessRequest) {
      throw new NotFoundError('Access request not found');
    }

    const updated = await prisma.userCompany.update({
      where: { id: accessRequest.id },
      data: {
        status: 'APPROVED',
        role,
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Reject user access (Admin only)
router.post('/:id/reject', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const accessRequest = await prisma.userCompany.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: 'PENDING',
      },
    });

    if (!accessRequest) {
      throw new NotFoundError('Access request not found');
    }

    const updated = await prisma.userCompany.update({
      where: { id: accessRequest.id },
      data: {
        status: 'REJECTED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Update user role (Admin only)
router.put('/:id/role', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(['ADMIN', 'USER']),
    }).parse(req.body);

    const userAccess = await prisma.userCompany.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: 'APPROVED',
      },
    });

    if (!userAccess) {
      throw new NotFoundError('User access not found');
    }

    // Prevent changing own role
    if (userAccess.userId === req.user!.userId) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const updated = await prisma.userCompany.update({
      where: { id: userAccess.id },
      data: { role },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Revoke user access (Admin only)
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const userAccess = await prisma.userCompany.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!userAccess) {
      throw new NotFoundError('User access not found');
    }

    // Prevent revoking own access
    if (userAccess.userId === req.user!.userId) {
      throw new ForbiddenError('Cannot revoke your own access');
    }

    await prisma.userCompany.delete({
      where: { id: userAccess.id },
    });

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    next(error);
  }
});

// Get my company access list
router.get('/my-companies', authenticate, async (req, res, next) => {
  try {
    const myAccess = await prisma.userCompany.findMany({
      where: {
        userId: req.user!.userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(myAccess);
  } catch (error) {
    next(error);
  }
});

// Switch active company
router.post('/switch-company', authenticate, async (req, res, next) => {
  try {
    const { companyId } = z.object({
      companyId: z.string().cuid(),
    }).parse(req.body);

    // Check if user has approved access to this company
    const access = await prisma.userCompany.findFirst({
      where: {
        userId: req.user!.userId,
        companyId,
        status: 'APPROVED',
      },
    });

    if (!access) {
      throw new ForbiddenError('You do not have access to this company');
    }

    // Return company info for client to update context
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
      },
    });

    res.json({ company, role: access.role });
  } catch (error) {
    next(error);
  }
});

export { router as userAccessRouter };
