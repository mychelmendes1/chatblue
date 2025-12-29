import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        name: string;
        email: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Verify user has access to the company in the token
    // Check if it's the primary company or an approved access
    const hasAccess = decoded.companyId === user.companyId || 
      await prisma.userCompany.findFirst({
        where: {
          userId: user.id,
          companyId: decoded.companyId,
          status: 'APPROVED',
        },
      });

    if (!hasAccess) {
      throw new UnauthorizedError('User no longer has access to this company. Please login again.');
    }

    // Use companyId and role from the JWT token, not from the database
    // This is important for multi-tenant switching - when user switches companies,
    // a new token is generated with the new companyId, but user.companyId in DB
    // remains as the primary company
    req.user = {
      userId: user.id,
      companyId: decoded.companyId, // Use from token, not from database
      role: decoded.role, // Use from token, not from database (role can vary per company)
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

export const requireSuperAdmin = authorize('SUPER_ADMIN');
export const requireAdmin = authorize('SUPER_ADMIN', 'ADMIN');
export const requireSupervisor = authorize('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR');
