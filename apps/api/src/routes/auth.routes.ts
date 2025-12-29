import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { UnauthorizedError, ValidationError } from '../middlewares/error.middleware.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  companyId: z.string().cuid(),
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, companyId: requestedCompanyId } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      companyId: z.string().cuid().optional(), // Optional: login directly to specific company
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
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

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User is inactive');
    }

    if (!user.company) {
      throw new UnauthorizedError('User company not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Get all companies user has access to (approved)
    const additionalCompanies = await prisma.userCompany.findMany({
      where: {
        userId: user.id,
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

    // Build list of all available companies
    const allCompanies = [
      {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        logo: user.company.logo,
        isActive: user.company.isActive,
        role: user.role, // Main company uses user's main role
        isPrimary: true,
      },
      ...additionalCompanies
        .filter(ac => ac.company.isActive && ac.company.id !== user.companyId)
        .map(ac => ({
          id: ac.company.id,
          name: ac.company.name,
          slug: ac.company.slug,
          logo: ac.company.logo,
          isActive: ac.company.isActive,
          role: ac.role,
          isPrimary: false,
        })),
    ];

    // Determine which company to use for this session
    let activeCompanyId = user.companyId;
    let activeRole = user.role;

    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      // Check if user has access to requested company
      const requestedAccess = additionalCompanies.find(
        ac => ac.companyId === requestedCompanyId && ac.company.isActive
      );
      if (requestedAccess) {
        activeCompanyId = requestedCompanyId;
        activeRole = requestedAccess.role;
      }
    }

    // Check if active company is active
    const activeCompany = allCompanies.find(c => c.id === activeCompanyId);
    if (!activeCompany || !activeCompany.isActive) {
      throw new UnauthorizedError('Company is inactive');
    }

    // Update online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Generate tokens with active company
    const payload = {
      userId: user.id,
      companyId: activeCompanyId,
      role: activeRole,
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

    // Store refresh token in Redis (keyed by user + company for multi-company support)
    await redis.setex(
      `refresh:${user.id}:${activeCompanyId}`,
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: activeRole,
        isAI: user.isAI,
        company: activeCompany,
      },
      companies: allCompanies.filter(c => c.isActive), // All available companies
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token required');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as { userId: string; companyId: string; role: string };

    // Verify token in Redis (check both old format and new format for backwards compatibility)
    let storedToken = await redis.get(`refresh:${decoded.userId}:${decoded.companyId}`);
    if (!storedToken) {
      // Try old format for backwards compatibility
      storedToken = await redis.get(`refresh:${decoded.userId}`);
    }
    
    if (storedToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        companyId: decoded.companyId,
        role: decoded.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Remove refresh token
    await redis.del(`refresh:${userId}`);

    // Update online status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        companyId: true,
        isAI: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
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
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get all companies user has access to
    const additionalCompanies = await prisma.userCompany.findMany({
      where: {
        userId: user.id,
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

    // Build list of all available companies
    const companies = [
      {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        logo: user.company.logo,
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
          role: ac.role,
          isPrimary: false,
        })),
    ];

    // Get current active company from token
    const activeCompanyId = req.user!.companyId;
    const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

    res.json({
      ...user,
      role: req.user!.role, // Role from token (may be different per company)
      activeCompany,
      companies,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
