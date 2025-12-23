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
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
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

    if (!user.company.isActive) {
      throw new UnauthorizedError('Company is inactive');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Generate tokens
    const payload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
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

    // Store refresh token in Redis
    await redis.setex(
      `refresh:${user.id}`,
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        isAI: user.isAI,
        company: user.company,
      },
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

    // Verify token in Redis
    const storedToken = await redis.get(`refresh:${decoded.userId}`);
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

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
