import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
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

// Get my company access list with unread message counts
router.get('/my-companies', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    
    // Get user's primary company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get all companies user has access to
    const additionalCompanies = await prisma.userCompany.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    // Build list of all companies
    const allCompanies = [
      {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        logo: user.company.logo,
        plan: user.company.plan,
        isActive: user.company.isActive,
        role: user.role,
        isPrimary: true,
      },
      ...additionalCompanies
        .filter(ac => ac.company.isActive && ac.company.id !== user.companyId)
        .map(ac => ({
          id: ac.company.id,
          name: ac.company.name,
          slug: ac.company.slug,
          logo: ac.company.logo,
          plan: ac.company.plan,
          isActive: ac.company.isActive,
          role: ac.role,
          isPrimary: false,
        })),
    ];

    // Get unread message counts for each company
    const companiesWithUnread = await Promise.all(
      allCompanies.map(async (company) => {
        // Get user's role for this specific company
        let userRoleInCompany: string = user.role;
        if (company.id !== user.companyId) {
          const access = await prisma.userCompany.findFirst({
            where: {
              userId,
              companyId: company.id,
              status: 'APPROVED',
            },
          });
          // Map UserCompanyRole to UserRole
          if (access?.role === 'ADMIN') {
            userRoleInCompany = 'ADMIN';
          } else {
            userRoleInCompany = 'AGENT';
          }
        }

        // Count unread messages for this company
        // For admins, count all unread messages in open tickets
        // For others, count only in tickets assigned to them
        const whereClause: any = {
          ticket: {
            companyId: company.id,
            status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
          },
          isFromMe: false,
          readAt: null,
        };

        if (userRoleInCompany !== 'ADMIN' && userRoleInCompany !== 'SUPER_ADMIN') {
          whereClause.ticket.assignedToId = userId;
        }

        const unreadCount = await prisma.message.count({
          where: whereClause,
        });

        return {
          ...company,
          unreadCount,
        };
      })
    );

    res.json(companiesWithUnread);
  } catch (error) {
    next(error);
  }
});

// Switch active company - generates new tokens for the selected company
router.post('/switch-company', authenticate, async (req, res, next) => {
  try {
    const { companyId } = z.object({
      companyId: z.string().cuid(),
    }).parse(req.body);

    const userId = req.user!.userId;

    // Get user's primary company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    let targetCompany;
    let targetRole;

    // Check if switching to primary company
    if (companyId === user.companyId) {
      if (!user.company.isActive) {
        throw new ForbiddenError('Company is inactive');
      }
      targetCompany = user.company;
      targetRole = user.role;
    } else {
      // Check if user has approved access to this company
      const access = await prisma.userCompany.findFirst({
        where: {
          userId,
          companyId,
          status: 'APPROVED',
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              isActive: true,
            },
          },
        },
      });

      if (!access) {
        throw new ForbiddenError('You do not have access to this company');
      }

      if (!access.company.isActive) {
        throw new ForbiddenError('Company is inactive');
      }

      targetCompany = access.company;
      targetRole = access.role;
    }

    // Generate new tokens for the target company
    const payload = {
      userId,
      companyId: targetCompany.id,
      role: targetRole,
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Store new refresh token in Redis
    await redis.setex(
      `refresh:${userId}:${targetCompany.id}`,
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    );

    res.json({
      company: targetCompany,
      role: targetRole,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

export { router as userAccessRouter };
