import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError } from './error.middleware.js';

/**
 * Middleware to ensure tenant isolation
 * Adds companyId filter to all database queries
 */
export const ensureTenant = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Super admins can access any company via query param
    if (req.user.role === 'SUPER_ADMIN' && req.query.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: req.query.companyId as string },
      });

      if (!company) {
        throw new NotFoundError('Company not found');
      }

      req.user.companyId = company.id;
    }

    // Ensure company is active
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: { isActive: true },
    });

    if (!company || !company.isActive) {
      throw new ForbiddenError('Company is inactive');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Create tenant-scoped Prisma client
 */
export const getTenantPrisma = (companyId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, companyId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, companyId };
          return query(args);
        },
        async findUnique({ args, query }) {
          // For findUnique, we validate after the query
          const result = await query(args);
          if (result && 'companyId' in result && result.companyId !== companyId) {
            return null;
          }
          return result;
        },
        async create({ args, query }) {
          args.data = { ...args.data, companyId } as any;
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, companyId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, companyId };
          return query(args);
        },
      },
    },
  });
};
